package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type client struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

var (
	mu      sync.Mutex
	clients = make(map[string]*client)
)

func init() {
	go func() {
		for {
			time.Sleep(time.Minute)
			mu.Lock()
			for ip, c := range clients {
				if time.Since(c.lastSeen) > 3*time.Minute {
					delete(clients, ip)
				}
			}
			mu.Unlock()
		}
	}()
}

func getClient(ip string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()
	if c, ok := clients[ip]; ok {
		c.lastSeen = time.Now()
		return c.limiter
	}
	l := rate.NewLimiter(rate.Every(time.Second), 10) // 10 req/sec burst
	clients[ip] = &client{limiter: l, lastSeen: time.Now()}
	return l
}

func RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !getClient(c.ClientIP()).Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many requests"})
			return
		}
		c.Next()
	}
}
