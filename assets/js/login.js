
login = document.getElementById("loginbtn");
signup = document.getElementById("signupbtn");

// Initialize Google Sign-In
function initializeGoogleSignIn() {
    google.accounts.id.initialize({
        client_id: '740297172896-9vlcq8hu7bjh457pm5ou3o8l8oljv5uj.apps.googleusercontent.com',
        callback: handleGoogleLogin
    });
    google.accounts.id.renderButton(
        document.getElementById('googleButton'),
        { 
            theme: 'outline', 
            size: 'large',
            text: 'signin_with',
            width: 250
        }
    );
    google.accounts.id.renderButton(
        document.getElementById('googleButtonSignup'),
        { 
            theme: 'outline', 
            size: 'large',
            text: 'signup_with',
            width: 250
        }
    );
}

window.onload = function() {
    if (typeof google !== 'undefined' && google.accounts) {
        initializeGoogleSignIn();
    } else {
        // Wait for Google library to load
        let attempts = 0;
        const checkGoogle = setInterval(() => {
            if (typeof google !== 'undefined' && google.accounts) {
                clearInterval(checkGoogle);
                initializeGoogleSignIn();
            } else if (++attempts > 50) {
                clearInterval(checkGoogle);
                console.error('Google Sign-In library failed to load');
            }
        }, 100);
    }
};

function handleGoogleLogin(response) {
    fetch("/auth/google", {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'token': response.credential
        })
    })
    .then(async res => {
        if(res.status == 200) {
            window.location.href = "/todo";
        } else {
            let body = await res.json();
            if(body.error) {
                console.error(body.error);
                document.getElementById('error').innerHTML = body.error;
            }
        }
    })
    .catch(error => {
        console.error(error);
        document.getElementById('error').innerHTML = 'Google login failed';
    });
}

login.addEventListener("click", () => {
    fetch("/login", {
        method : 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        body : JSON.stringify( {
            'email' : document.getElementById("loginemail").value,
            'password' : document.getElementById("loginpass").value,
        })
    })
    .then(async response => {
        if(response.status == 200) {
            window.location.href = "/todo";
        } else {
            let body = await response.json();
            if(body.error) {
                console.error(body.error);
                document.getElementById('error').innerHTML=body.error;
            }
            // var str = JSON.stringify(response.json());
            // document.write(str)
        }
        
    })
    .catch(error => {
        console.error(error);
    })
});

signup.addEventListener("click", () => {
    fetch("/signup", {
        method : 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        body : JSON.stringify( {
            'username' : document.getElementById("signupname").value,
            'email' : document.getElementById("signupemail").value,
            'password' : document.getElementById("signuppass").value
        })
    })
    .then(response => {
        if(response.status == 200) {
            window.location.href = "/todo";
        } else {
            var str = JSON.stringify(response.json());
            document.write(str)
        }
        
    })
});
