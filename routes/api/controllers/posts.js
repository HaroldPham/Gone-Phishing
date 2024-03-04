import express from 'express';
import multer from 'multer';
import fs from 'fs';
import bodyParser from 'body-parser';
import path from 'path';
import models from '../../../models.js'
import { format } from 'date-fns';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename + "/../../..");

var router = express.Router();

router.use(bodyParser.urlencoded({ extended: false }))
router.use(bodyParser.json())

// multer middleware used for handling the image uploads on posts
// all images are added to the /uploads directory with randomized filenames
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './routes/api/uploads')
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now())
  }
});

var upload = multer({ storage: storage });

export function isAuthenticated(req, res, next) {
    if (req.session.isAuthenticated) {
      next();
    } else {
      res.status(401).json({
        status: "error",
        error: "not logged in"
      });
    }
  }

router.post('/', upload.single('image'), isAuthenticated, async (req, res) => {
    try {
      let username = req.session.account.username

      // create a user and set reputation score to nil
      let postUser = await req.models.User.findOne({ username: username });
      if (postUser == null) {
        const newUser = new req.models.User({
          username: username,
          reputation_score: 0
        });
        await newUser.save();
      }

      // create the image object for the uploaded file
      let imageObj;
      if (req.file != null) {
        imageObj = {
          data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
          contentType: req.file.mimetype
        };
      }

      const newPost = new models.Post({
        username: username,
        scam_date: req.body.scam_date,
        description: req.body.description,
        image: imageObj,
        anonymous: req.body.anonymous,
        scam_type: req.body.scam_type,
        frequency: req.body.frequency,
        scammer_phone: req.body.scammer_phone,
        scammer_email: req.body.scammer_email,
        org: req.body.org,
        created_date: new Date()
      }) //could've probably used the split operator here but a little too late

      await newPost.save();

      res.send({status: 'success'});
    } catch(error) {
      console.log(error);
      res.status(500).json({status:"error", message:error.message});
    }
});

router.get('/', async (req, res) => {
    try {
      //Add all the filtering options to the json object
      const query = {}; //looks like these req.query requests come from index.js loadPost() function.
      if(req.query.username) {
          query.username = req.query.username; //need more than this, will be implemented later.
      }
      if(req.query.scam_type) {
        query.scam_type = req.query.scam_type;
      }
      if(req.query.org) {
        query.org = req.query.org;
      }
      if(req.query.frequency) {
        query.frequency = req.query.frequency;
      }

      let sort = {};
        if (req.query.sort === 'newest') {
            sort = { created_date: -1 }; // sort by created_date in descending order (newest first)
        } else if (req.query.sort === 'oldest') {
            sort = { created_date: 1 }; // sort by created_date in ascending order (oldest first)
        }

      //use the filters to get only the matching posts back using the json object from earleir
      const posts = await req.models.Post.find(query).sort(sort);

      //Then make a array of all the posts to send back to the index.js to be displayed there.
      const postData = await Promise.all(
        posts.map(async post => {
          return {
            id: post._id,
            username: post.username,
            scam_date: post.scam_date,
            description: post.description,
            image: post.image,
            anonymous: post.anonymous,
            scam_type: post.scam_type,
            frequency: post.frequency,
            scammer_phone: post.scammer_phone,
            scammer_email: post.scammer_email,
            likes: post.likes,
            org: post.org,
            created_date: format(post.created_date, 'EEE MMM dd yyyy')
          };
        })
        );
        res.json(postData);
    } catch (error) {
        console.log(error);
        res.status(500).json({ status: "error", error: error.message });
    }
});

//generates filtering options, can add more later
router.get('/filter-options', async (req, res) => {
  try {
      const frequency = await req.models.Post.distinct('frequency');
      const scamTypes = await req.models.Post.distinct('scam_type');
      const orgs = await req.models.Post.distinct('org');

      res.json({ frequency, scamTypes, orgs });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
  }
});

router.post('/like', isAuthenticated, async(req, res) => {
  let currUser = req.session.account.username;
  try {
    const post = await req.models.Post.findById(req.body.postID);
    if(!post.likes.includes(currUser)) {
      post.likes.push(currUser);
      await post.save();
    }

    // update the user's reputation score if post is not anonymous
    if (!post.anonymous) {
      const postUser = await req.models.User.findOne({ username: post.username });
      await postUser.updateOne({ reputation_score: postUser.reputation_score + 1 });
    }

    res.json({status: 'success'});
  } catch (error) {
    console.log(error);
    res.status(500).json({status: "error", error: error.message});
  }
});

router.post('/unlike', isAuthenticated, async(req, res) => {
  let currUser = req.session.account.username;
  try {
    const post = await req.models.Post.findById(req.body.postID);
    if(post.likes.includes(currUser)) {
      let index = post.likes.indexOf(currUser);
      post.likes.splice(index, 1);
      await post.save();
    }

    // update the user's reputation score
    // anonymous posts don't go towards reputation score
    if (!post.anonymous) {
      const postUser = await req.models.User.findOne({ username: post.username });
      if (postUser != null) {
        await postUser.updateOne({ reputation_score: postUser.reputation_score - 1 });
      }
    }

    res.json({status: 'success'});
  } catch (error) {
    console.log(error);
    res.status(500).json({status: "error", error: error.message});
  }
});

router.delete('/', isAuthenticated, async(req, res) => {
  let currUser = req.session.account.username;
  try {
    const post = await req.models.Post.findById(req.body.postID);
    if(post.username !== currUser) {
      res.status(401).json({
        status: 'error',
        error: "you can only delete your own posts"
     })
    }

    await req.models.Comment.deleteMany( {post : req.body.postID} );

    // remember to also update the reputation score
    const postUser = await req.models.User.findOne({ username: post.username });
    if (postUser != null) {
      await postUser.updateOne({ reputation_score: postUser.reputation_score - post.likes.length });
    }

    await post.deleteOne({ _id: req.body.postID });

    res.json({status: "success"});
  } catch (error) {
    console.log(error);
    res.status(500).json({status: "error", error: error.message});
  }
});

export default router;