import { Injectable } from '@nestjs/common';
import {
  CommentLike,
  CommentLikeDocument,
  CommentLikeModelType,
} from '../domain/comment-like.entity';
import { InjectModel } from '@nestjs/mongoose';
import { CommentLikeStatus } from '../api/models/input/comment-like.input.model';
import { ObjectId } from 'mongodb';

Injectable();
export class CommentLikesRepository {
  constructor(
    @InjectModel(CommentLike.name)
    private commentLikeModel: CommentLikeModelType,
  ) {}

  async findLikeByUserIdAndCommentId(
    userId: string,
    commentId: string,
  ): Promise<CommentLikeDocument | null> {
    try {
      const like: CommentLikeDocument | null =
        await this.commentLikeModel.findOne({
          userId: userId,
          commentId: commentId,
        });

      if (like) {
        return like;
      } else {
        return null;
      }
    } catch (err) {
      console.error(err, 'could not find CommentLikeDocument, repo');
      return null;
    }
  }

  async createLikeOrDislike(
    commentLikeDTO: CommentLike,
  ): Promise<CommentLikeDocument | null> {
    try {
      const createdLike: CommentLikeDocument = new this.commentLikeModel(
        commentLikeDTO,
      );
      return await createdLike.save();
    } catch (error) {
      console.error(error, 'CommentLike could not be created');
      return null;
    }
  }

  async updateLikeOrDislike(
    likeId: string,
    likeStatus: CommentLikeStatus,
  ): Promise<boolean> {
    try {
      const result = await this.commentLikeModel.updateOne(
        { _id: new ObjectId(likeId) },
        { $set: { status: likeStatus } },
      );

      return result.matchedCount === 1;
    } catch (error) {
      console.error(error, 'CommentLike could not be updated');
      return false;
    }
  }

  async findLikesByCommentIds(
    commentIds: string[],
  ): Promise<CommentLikeDocument[]> {
    return this.commentLikeModel.find({ commentId: { $in: commentIds } });
  }
}
