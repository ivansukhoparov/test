import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import {
  Post,
  PostDocument,
  PostModelType,
} from '../../posts/domain/post.entity';
import { PostInputModel } from '../api/models/input/create-post.input.model';

@Injectable()
export class PostsRepository {
  constructor(@InjectModel(Post.name) private postModel: PostModelType) {}

  //TODO: question in createPost and createComment
  async createPost(postDTO: Post): Promise<string | null> {
    try {
      //TODO:what's the type here?
      const createdPost = new this.postModel(postDTO);

      const result: PostDocument = await createdPost.save();

      return result._id.toString();
    } catch (error) {
      console.log(error, 'unable to create a new post, repo');
      return null;
    }
  }

  async findPostById(id: string): Promise<PostDocument | null> {
    const post: PostDocument | null = await this.postModel.findOne({
      _id: new ObjectId(id),
    });

    if (post) {
      return post;
    } else {
      return null;
    }
  }

  async updatePost(id: string, postDTO: PostInputModel): Promise<boolean> {
    try {
      const result = await this.postModel.updateOne(
        { _id: new ObjectId(id) },
        { $set: postDTO },
      );

      return result.matchedCount === 1 && result.modifiedCount === 1;
      //1 = true, 0 === false
    } catch (err) {
      console.error(err, 'unable to update the post, repo');
      return false;
    }
  }

  async deletePost(id: string): Promise<boolean> {
    const deletionResult = await this.postModel.deleteOne({
      _id: new ObjectId(id),
    });

    return deletionResult.deletedCount === 1;
  }

  async updateLikeDislikeCount(
    postId: string,
    likeIncrement: number,
    dislikeIncrement: number,
  ): Promise<boolean> {
    try {
      const result = await this.postModel.updateOne(
        { _id: new ObjectId(postId) },
        {
          $inc: {
            likesCount: likeIncrement,
            dislikesCount: dislikeIncrement,
          },
        },
      );
      return result.modifiedCount === 1;
    } catch (error) {
      console.error(
        `Error in repo updating dis/like count for the post: ${postId}`,
        error,
      );
      return false;
    }
  }
}
