const Media = require("../models/Media");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");

//Post deleted --> eventHandler --> mediaId sources deleted-->
const handlePostDeleted = async (event) => {
  console.log("Event media: ", event);
  const { postId, mediaIds } = event;
  try {
    if (!mediaIds) {
      logger.info(`post ${postId} was deleted with no media attached`);
    } else {
      //get array of _ids from MongoDB == mediaIds array
      const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });
      //loop through the media array
      for (const media of mediaToDelete) {
        //1--delete a file from cloudinary
        await deleteMediaFromCloudinary(media.publicId);
        //2--delete a file from MongoDB
        await Media.findByIdAndDelete(media._id);
        logger.info(
          `Deleted media ${media._id} associated with this deleted post ${postId}`,
        );
      }
    }
  } catch (error) {
    logger.error("Error occured while media delete ", error);
  }
};

//----
module.exports = {
  handlePostDeleted,
};
