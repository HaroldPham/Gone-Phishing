import mongoose from 'mongoose';

let models = {};

main().catch(err => console.log(err))
async function main() {
    console.log('connecting to mongodb');

    await mongoose.connect('mongodb+srv://gonephishingUser:SCRAM@web-dev-cluster.zkgq6po.mongodb.net/?retryWrites=true&w=majority');

    console.log('succesffully connected to mongodb!');

    const postSchema = new mongoose.Schema({
        username: String,
        scam_date: String,
        description: {
            type: String,
            required: true
        },
        image: {
            data: Buffer,
            contentType: String
        },
        anonymous: Boolean,
        scam_type: String,
        frequency: Number, //restrict this to a scale of 1-5. 1 is less frequent, 5 is most frequent.
        scammer_phone: String, //Returns a string of 10 digits, either in "000-000-0000" or "0000000000" format, we need to post process it later.
        scammer_email: String, //The input handling it should return an email formatted string.
        likes: [String],
        org: String,
        created_date: Date
    });

    const commentSchema = new mongoose.Schema({
        username: String,
        comment: String,
        post: { type: mongoose.Schema.Types.ObjectId, ref: 'post' },
        created_date: String
    });

    const userSchema = new mongoose.Schema({
        username: String,
        reputation_score: Number
    });

    models.Post = mongoose.model('Post', postSchema);
    models.Comment = mongoose.model('Comment', commentSchema);
    models.User = mongoose.model('User', userSchema);
    console.log('mongoose models created');
}

export default models;