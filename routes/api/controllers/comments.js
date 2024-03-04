import express from 'express';
import { isAuthenticated } from './posts.js';

var router = express.Router();

router.get('/', async (req, res) => {
    try {
        const postID = req.query.postID;
        const comments = await req.models.Comment.find({ post: postID });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
})


router.post('/', isAuthenticated, async (req,res) => {
    try{
      const newComment = new req.models.Comment({
        username: req.session.account.username,
        comment: req.body.newComment,
        post: req.body.postID,
        created_date: new Date().toLocaleDateString('en-US')
      })

      await newComment.save()

      res.json({status: 'success'});
    } catch (error) {
      console.log(error);
      res.status(500).json({status:"error", message:error.message});
    }
});

export default router;