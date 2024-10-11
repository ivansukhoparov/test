import { Injectable } from '@nestjs/common';
import {
  PostLike,
  PostLikeDocument,
  PostLikeModelType,
} from '../domain/post-like.entity';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { PostLikeStatus } from '../api/models/input/post-like.input.model';

@Injectable()
export class PostLikesRepository {
  constructor(
    @InjectModel(PostLike.name) private postLikeModel: PostLikeModelType,
  ) {}

  async findLikeByUserIdAndPostId(
    userId: string,
    postId: string,
  ): Promise<PostLikeDocument | null> {
    const like: PostLikeDocument | null = await this.postLikeModel.findOne({
      userId: userId,
      postId: postId,
    });

    if (like) {
      return like;
    } else {
      return null;
    }
  }

  async createLikeOrDislike(postLikeDTO: PostLike): Promise<string | null> {
    try {
      const like = new this.postLikeModel(postLikeDTO);
      //console.log('Like created in repo: ', like);

      const savedLike: PostLikeDocument = await like.save();
      //console.log('Saved like ID from repo: ', savedLike._id.toString());

      return savedLike._id.toString();
    } catch (error) {
      console.log(error, 'unable to create a new like, repo');
      return null;
    }
  }

  async updateLikeOrDislike(likeId: string, likeStatus: PostLikeStatus) {
    //console.log('Like status from req in repo: ', likeStatus);

    const result = await this.postLikeModel.updateOne(
      { _id: new ObjectId(likeId) },
      { $set: { status: likeStatus } },
    );

    return result.matchedCount === 1;
  }
}
