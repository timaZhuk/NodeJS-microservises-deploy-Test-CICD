const Search = require("../models/Search.js");
const logger = require("../utils/logger.js");

//consume "post.created" routing key event
async function handlePostCreated(event) {
  try {
    //create Search object in Mongo DB
    const newSearchPost = new Search({
      postId: event.postId,
      userId: event.userId,
      content: event.content,
      createdAt: event.createdAt,
    });

    await newSearchPost.save();
    logger.info(
      `Search post created: ${event.postId}, ${newSearchPost._id.toString()}`,
    );
    console.log(newSearchPost);
  } catch (error) {
    logger.error("Error handling post creation event in Search service", error);
  }
}

//consume event = "post.deleted"
async function handlepostDeleted(event) {
  try {
    await Search.findOneAndDelete({ postId: event.postId });
    logger.info(`Search post is deleted: ${event.postId}`);
  } catch (error) {
    logger.error("Error handling post deletion event", error);
  }
}

//----
module.exports = {
  handlePostCreated,
  handlepostDeleted,
};
