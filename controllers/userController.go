package controller

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/victordickson/tasky/auth"
	"github.com/victordickson/tasky/database"
	"github.com/victordickson/tasky/models"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

var SECRET_KEY string = os.Getenv("SECRET_KEY")
var userCollection *mongo.Collection = database.OpenCollection(database.Client, "user")


func SignUp(c * gin.Context){
	
	var user models.User
	if err := c.BindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)

	emailCount, err := userCollection.CountDocuments(ctx, bson.M{"email": user.Email})
	defer cancel()

	if err != nil {
		log.Panic(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error occured while checking for the email"})
	}

	password := HashPassword(*user.Password)
	user.Password = &password

	if emailCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User with this email already exists!"})
		return
	}
	user.ID = primitive.NewObjectID()
	resultInsertionNumber, insertErr := userCollection.InsertOne(ctx, user)
	if insertErr != nil {
		msg := fmt.Sprintf("user item was not created")
		c.JSON(http.StatusInternalServerError, gin.H{"error": msg})
		return
	}
	defer cancel()
	userId := user.ID.Hex()
	username := *user.Name

	token, err, expirationTime := auth.GenerateJWT(userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error occured while generating token"})
		return
	}

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "token",
		Value:    token,
		Expires:  expirationTime,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "userID",
		Value:    userId,
		Expires:  expirationTime,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "username",
		Value:    username,
		Expires:  expirationTime,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	c.JSON(http.StatusOK, resultInsertionNumber)


}
func Login(c * gin.Context){
	var user models.User
	var foundUser models.User
	
	if err := c.BindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bind error"})
		return
	}
	var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)

	err := userCollection.FindOne(ctx, bson.M{"email": user.Email}).Decode(&foundUser)
	defer cancel()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": " email or password is incorrect"})
		return
	}

	passwordIsValid, msg := VerifyPassword(*user.Password, *foundUser.Password)
	defer cancel()

	if passwordIsValid != true {
		c.JSON(http.StatusInternalServerError, gin.H{"error": msg})
		return
	}

	if foundUser.Email == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found!"})
		return
	}
	userId := foundUser.ID.Hex()
	username := ""
	if foundUser.Name != nil {
		username = *foundUser.Name
	}
	
	token, err, expirationTime := auth.GenerateJWT(userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error occured while generating token"})
		return
	}

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "token",
		Value:    token,
		Expires:  expirationTime,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "userID",
		Value:    userId,
		Expires:  expirationTime,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "username",
		Value:    username,
		Expires:  expirationTime,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})
	c.JSON(http.StatusOK, gin.H{"msg": "login successful"})
}

func Todo(c * gin.Context) {
	session := auth.ValidateSession(c)
	if session {
		c.HTML(http.StatusOK,"app.html", nil)
	}
}

func HashPassword(password string) string {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	if err != nil {
		log.Panic(err)
	}
	return string(bytes)
}

func VerifyPassword(userPassword string, providedPassword string) (bool, string) {
	err := bcrypt.CompareHashAndPassword([]byte(providedPassword), []byte(userPassword))
	check := true
	msg := ""

	if err != nil {
		msg = fmt.Sprintf("email or password is incorrect")
		check = false
	}

	return check, msg
}

type GoogleUserInfo struct {
	ID            string `json:"sub"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

func GoogleLogin(c *gin.Context) {
	var request struct {
		Token string `json:"token"`
	}

	if err := c.BindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Decode the JWT token from Google (it's a JWT, not an access token)
	// The token contains user info in the payload
	parts := strings.Split(request.Token, ".")
	if len(parts) != 3 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid token format"})
		return
	}

	// Decode the payload (second part of JWT)
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to decode token"})
		return
	}

	var googleUser GoogleUserInfo
	if err := json.Unmarshal(payload, &googleUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user info"})
		return
	}

	if googleUser.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email not found in token"})
		return
	}

	var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
	defer cancel()

	var foundUser models.User
	err = userCollection.FindOne(ctx, bson.M{"email": googleUser.Email, "provider": "google"}).Decode(&foundUser)

	if err == mongo.ErrNoDocuments {
		user := models.User{
			ID:         primitive.NewObjectID(),
			Name:       &googleUser.Name,
			Email:      &googleUser.Email,
			Provider:   "google",
			ProviderID: googleUser.ID,
		}

		_, insertErr := userCollection.InsertOne(ctx, user)
		if insertErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}
		foundUser = user
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	userId := foundUser.ID.Hex()
	username := ""
	if foundUser.Name != nil {
		username = *foundUser.Name
	}

	token, err, expirationTime := auth.GenerateJWT(userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "token",
		Value:    token,
		Expires:  expirationTime,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "userID",
		Value:    userId,
		Expires:  expirationTime,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "username",
		Value:    username,
		Expires:  expirationTime,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	c.JSON(http.StatusOK, gin.H{"msg": "login successful"})
}