package main

import (
	"net/http"
	controller "github.com/victordickson/tasky/controllers"
	"github.com/victordickson/tasky/middleware"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func index(c *gin.Context) {
	c.HTML(http.StatusOK, "login.html", nil)
}

func app(c *gin.Context) {
	c.HTML(http.StatusOK, "app.html", nil)
}

func main() {
	godotenv.Overload()
	
	router := gin.Default()
	router.Use(middleware.RateLimit())
	router.LoadHTMLGlob("assets/*.html")
	router.Static("/assets", "./assets")

	router.GET("/", index)
	
	// Todo routes
	router.GET("/todos/:userid", controller.GetTodos)
	router.GET("/todo/:id", controller.GetTodo)
	router.POST("/todo/:userid", controller.AddTodo)
	router.DELETE("/todo/:userid/:id", controller.DeleteTodo)
	router.DELETE("/todos/:userid", controller.ClearAll)
	router.PUT("/todo", controller.UpdateTodo)
	router.GET("/stats/:userid", controller.GetTaskStats)

	// Project routes
	router.GET("/projects/:userid", controller.GetProjects)
	router.POST("/project/:userid", controller.CreateProject)
	router.PUT("/project/:userid/:id", controller.UpdateProject)
	router.DELETE("/project/:userid/:id", controller.DeleteProject)

	// Auth routes
	router.POST("/signup", controller.SignUp)
	router.POST("/login", controller.Login)
	router.POST("/auth/google", controller.GoogleLogin)
	router.GET("/app", app)

	router.Run(":8080" )

}
