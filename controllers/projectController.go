package controller

import (
	"context"
	"net/http"
	"time"

	"github.com/victordickson/tasky/auth"
	"github.com/victordickson/tasky/database"
	"github.com/victordickson/tasky/models"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

var projectCollection *mongo.Collection = database.OpenCollection(database.Client, "projects")

func GetProjects(c *gin.Context) {
	session := auth.ValidateSession(c)
	if !session {
		return
	}
	var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
	defer cancel()

	userid := c.Param("userid")
	cursor, err := projectCollection.Find(ctx, bson.M{"user_id": userid})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var projects []models.Project
	if err = cursor.All(ctx, &projects); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if projects == nil {
		projects = []models.Project{}
	}

	c.JSON(http.StatusOK, projects)
}

func CreateProject(c *gin.Context) {
	session := auth.ValidateSession(c)
	if !session {
		return
	}
	var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
	defer cancel()

	var project models.Project
	if err := c.BindJSON(&project); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	project.ID = primitive.NewObjectID()
	project.UserID = c.Param("userid")
	project.CreatedAt = time.Now()
	project.UpdatedAt = time.Now()

	_, err := projectCollection.InsertOne(ctx, project)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, project)
}

func UpdateProject(c *gin.Context) {
	session := auth.ValidateSession(c)
	if !session {
		return
	}
	var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
	defer cancel()

	id := c.Param("id")
	objId, _ := primitive.ObjectIDFromHex(id)

	var project models.Project
	if err := c.BindJSON(&project); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	project.UpdatedAt = time.Now()
	_, err := projectCollection.UpdateOne(ctx, bson.M{"_id": objId}, bson.M{"$set": project})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, project)
}

func DeleteProject(c *gin.Context) {
	session := auth.ValidateSession(c)
	if !session {
		return
	}
	var ctx, cancel = context.WithTimeout(context.Background(), 100*time.Second)
	defer cancel()

	id := c.Param("id")
	userid := c.Param("userid")
	objId, _ := primitive.ObjectIDFromHex(id)

	_, err := projectCollection.DeleteOne(ctx, bson.M{"_id": objId, "user_id": userid})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": "Project deleted"})
}
