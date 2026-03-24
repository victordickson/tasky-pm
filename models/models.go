package models

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Todo struct {
	ID          primitive.ObjectID   `bson:"_id" json:"id"`
	Name        string               `json:"name" bson:"name"`
	Description string               `json:"description" bson:"description"`
	Status      string               `json:"status" bson:"status"`
	Priority    string               `json:"priority" bson:"priority"`
	Category    string               `json:"category" bson:"category"`
	DueDate     *time.Time           `json:"due_date" bson:"due_date"`
	ProjectID   string               `json:"project_id" bson:"project_id"`
	UserID      string               `json:"user_id" bson:"user_id"`
	Subtasks    []Subtask            `json:"subtasks" bson:"subtasks"`
	Tags        []string             `json:"tags" bson:"tags"`
	CreatedAt   time.Time            `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time            `json:"updated_at" bson:"updated_at"`
	CompletedAt *time.Time           `json:"completed_at" bson:"completed_at"`
}

type Subtask struct {
	ID        primitive.ObjectID `bson:"_id" json:"id"`
	Name      string             `json:"name" bson:"name"`
	Completed bool               `json:"completed" bson:"completed"`
}

type Project struct {
	ID          primitive.ObjectID `bson:"_id" json:"id"`
	Name        string             `json:"name" bson:"name"`
	Description string             `json:"description" bson:"description"`
	Color       string             `json:"color" bson:"color"`
	UserID      string             `json:"user_id" bson:"user_id"`
	CreatedAt   time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at" bson:"updated_at"`
}

type User struct {
	ID         primitive.ObjectID `bson:"_id"`
	Name       *string            `json:"username" bson:"username"`
	Email      *string            `json:"email" bson:"email"`
	Password   *string            `json:"password" bson:"password"`
	Provider   string             `json:"provider" bson:"provider"`
	ProviderID string             `json:"provider_id" bson:"provider_id"`
}

