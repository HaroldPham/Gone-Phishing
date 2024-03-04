import express from 'express';
var router = express.Router();

import postsRouter from './controllers/posts.js';
import usersRouter from './controllers/users.js';
import commentRouter from './controllers/comments.js';

router.use('/comments', commentRouter);
router.use('/posts', postsRouter);
router.use('/users', usersRouter);
export default router;