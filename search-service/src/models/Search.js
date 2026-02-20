const mongoose = require("mongoose");

const searchPostSchema = new mongoose.Schema(
  {
    postId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

//---indexing for searching
searchPostSchema.index({ content: "text" });
searchPostSchema.index({ createdAt: -1 });

//searchs
const Search = mongoose.model("Search", searchPostSchema);

//--
module.exports = Search;
