import express from 'express';

var router = express.Router();

function isLoggedIn(req, res, next) {
    if (req.session.isAuthenticated) {
      next();
    } else {
      res.json({ status: "loggedout" });
    }
  }

router.get('/myIdentity', isLoggedIn, (req, res) => {
    const userInfo = {
        name: req.session.account.name,
        username: req.session.account.username
    }
    res.json({
        status: "loggedin",
        userInfo: userInfo
    });
});

router.get('/reputationScore', async (req, res) => {
  try {
    const usernameParam = req.query.username;
    if (usernameParam == "Anonymous") {
      res.status(400).json({
        status: "error",
        message: "cannot access reputation score for Anonymous"
      });
    } else if (usernameParam == null) {
      let users = await req.models.User.find();
      let usersJson = {};
      users.forEach(user => {
        usersJson[user.username] = user.reputation_score;
      });
      res.json(usersJson);
    } else {
      const user = await req.models.User.findOne({ username: usernameParam });
      if (user == null) {
        res.json({
          status: "nocontent",
          message: "This user does not have any saved info yet."
        });
      } else {
        res.json(user);
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "error", error: error.message });
  }
});

export default router;