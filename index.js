const express = require("express");
const app = express();
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const expressSession = require("express-session");
const mongoose = require("mongoose");
const flash = require("express-flash");
const User = require("./models/User");
mongoose.connect("mongodb://localhost/passport-test");
mongoose.promise = Promise;

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(flash());
app.use(
  expressSession({
    secret: "keyboard cat",
    saveUninitialized: false,
    resave: false
  })
);
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(function(username, password, done) {
    User.findOne({ username }, function(err, user) {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false, { message: "Incorrect username." });
      }
      if (!user.validPassword(password)) {
        return done(null, false, { message: "Incorrect password." });
      }
      return done(null, user);
    });
  })
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// facebook
const FacebookStrategy = require("passport-facebook").Strategy;
const FACEBOOK_APP_ID = process.env.FB_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FB_APP_SECRET;

passport.use(
  new FacebookStrategy(
    {
      clientID: FACEBOOK_APP_ID,
      clientSecret: FACEBOOK_APP_SECRET,
      callbackURL: "http://localhost:4000/auth/facebook/callback",
      passReqToCallback: true
    },
    function(req, accessToken, refreshToken, profile, done) {
      const facebookId = profile.id;
      if (req.user) {
        req.user.facebookId = facebookId;
        req.user.save((err, user) => {
          if (err) {
            done(err);
          } else {
            done(null, user);
          }
        });
      } else {
        User.findOne({ facebookId }, function(err, user) {
          if (err) {
            console.log(err);
            return done(err);
          }
          console.log("H", user);
          if (!user) {
            user = new User({ facebookId, username: profile.displayName });
            console.log(user);
            user.save((err, user) => {
              if (err) {
                console.log(err);
              }
              done(null, user);
            });
          } else {
            done(null, user);
          }
        });
      }
    }
  )
);

app.get("/auth/facebook", passport.authenticate("facebook"));

app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    successRedirect: "/",
    failureRedirect: "/login"
  })
);

app.set("view engine", "hbs");

app.get("/", (req, res) => {
  if (req.user) {
    res.render("home", { user: req.user });
  } else {
    res.redirect("/login");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/profile", (req, res) => {
  const { password, username } = req.body;
  const user = req.user;
  console.log(user);
  if (password) user.password = password;
  if (username) user.username = username;
  user.save((err, user) => {
    if (err) {
      console.log(err);
      req.flash("warning", "fail");
      res.redirect("back");
    } else {
      req.flash("warning", "success");
      res.redirect("back");
    }
  });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
  })
);

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
  })
);

app.post("/register", (req, res, next) => {
  const { username, password } = req.body;
  console.log(req.body);
  const user = new User({ username, password });
  user.save((err, user) => {
    console.log(err, user);
    req.login(user, function(err) {
      if (err) {
        return next(err);
      }
      return res.redirect("/");
    });
  });
});

app.listen(4000);
