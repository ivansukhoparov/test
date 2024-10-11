import { InjectModel } from '@nestjs/mongoose';
import {
  Comment,
  CommentDocument,
  CommentModelType,
} from '../domain/comment.entity';
import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { CommentLikeStatus } from '../comment-likes/api/models/input/comment-like.input.model';

@Injectable()
export class CommentsRepository {
  constructor(
    @InjectModel(Comment.name) private commentModel: CommentModelType,
  ) {}

  async createCommentByPostId(commentDTO: Comment) {
    const createdComment = new this.commentModel(commentDTO);
    try {
      const result: CommentDocument = await createdComment.save();
      return result._id.toString();
    } catch (e) {
      console.log(e, 'unable to create a comment, repo');
      return null;
    }
  }

  async findCommentById(id: string): Promise<CommentDocument | null> {
    const comment: CommentDocument | null = await this.commentModel.findOne({
      _id: new ObjectId(id),
    });

    if (comment) {
      return comment;
    } else {
      return null;
    }
  }

  async updateCommentByCommentId(
    content: string,
    commentId: string,
    userId: string,
  ): Promise<boolean> {
    const result = await this.commentModel.updateOne(
      {
        $and: [
          { _id: new ObjectId(commentId) },
          { 'commentatorInfo.userId': userId },
        ],
      },
      { $set: { content: content } },
    );

    return result.matchedCount === 1;
  }

  async deleteCommentById(id: string): Promise<boolean> {
    const result = await this.commentModel.deleteOne({ _id: new ObjectId(id) });

    return result.deletedCount === 1;
  }

  async updateLikeDislikeCount(
    commentId: string,
    likeStatus: CommentLikeStatus,
    likeIncrement: number,
    dislikeIncrement: number,
  ): Promise<boolean> {
    try {
      const result = await this.commentModel.updateOne(
        { _id: new ObjectId(commentId) },
        {
          $set: { 'likesInfo.myStatus': likeStatus },
          $inc: {
            'likesInfo.likesCount': likeIncrement,
            'likesInfo.dislikesCount': dislikeIncrement,
          },
        },
      );
      return result.modifiedCount === 1;
    } catch (error) {
      console.error(
        `Error in repo updating CommentLikeStatus for commentId: ${commentId}`,
        error,
      );
      return false;
    }
  }
}
