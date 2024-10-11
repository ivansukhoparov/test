import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { CommentViewModel } from '../api/models/output/comment.output.model';
import {
  Comment,
  CommentDocument,
  CommentModelType,
} from '../domain/comment.entity';
import {
  CommentLike,
  CommentLikeDocument,
  CommentLikeModelType,
} from '../comment-likes/domain/comment-like.entity';
import {
  Pagination,
  PaginationOutput,
} from '../../../base/models/pagination.base.model';
import { FilterQuery } from 'mongoose';
import { Post } from '../../posts/domain/post.entity';
import { CommentLikeStatus } from '../comment-likes/api/models/input/comment-like.input.model';

@Injectable()
export class CommentsQueryRepository {
  constructor(
    @InjectModel(Comment.name)
    private commentModel: CommentModelType,
    @InjectModel(CommentLike.name)
    private commentLikeModel: CommentLikeModelType,
  ) {}

  mapToOutput(
    comment: CommentDocument,
    status: CommentLikeStatus,
  ): CommentViewModel {
    return {
      id: comment._id.toString(),
      content: comment.content,
      commentatorInfo: {
        userId: comment.commentatorInfo.userId,
        userLogin: comment.commentatorInfo.userLogin,
      },
      createdAt: comment.createdAt,
      likesInfo: {
        likesCount: comment.likesInfo.likesCount,
        dislikesCount: comment.likesInfo.dislikesCount,
        myStatus: status,
      },
    };
  }

  async getCommentById(
    id: string,
    userId: string | null,
  ): Promise<CommentViewModel | null> {
    const comment: CommentDocument | null = await this.commentModel.findOne({
      _id: new ObjectId(id),
    });
    if (!comment) {
      return null;
    }

    let myStatus = CommentLikeStatus.None;
    if (userId) {
      const like: CommentLikeDocument | null =
        await this.commentLikeModel.findOne({
          userId: userId,
          commentId: comment._id.toString(),
        });
      if (like) {
        myStatus = like.status;
      }
    }

    //return PostOutputModelMapper(post);
    return this.mapToOutput(comment, myStatus);
  }

  async getCommentsByPostsId(
    pagination: Pagination,
    userId: string | null,
    postId: string,
  ): Promise<PaginationOutput<CommentViewModel> | null> {
    const filters: FilterQuery<Post>[] = [];

    /*if (pagination.searchNameTerm) {
      filters.push({
        name: { $regex: pagination.searchNameTerm, $options: 'i' },
      });
    }*/
    //console.log(pagination);

    const filter: FilterQuery<Comment> = { postId: postId };

    if (filters.length > 0) {
      filter.$or = filters;
    }

    return await this.__getResult(filter, pagination, userId);
  }

  private async __getResult(
    filter: FilterQuery<Comment>,
    pagination: Pagination,
    userId: string | null,
  ): Promise<PaginationOutput<CommentViewModel> | null> {
    const comments = await this.commentModel
      .find(filter)
      .sort({
        [pagination.sortBy]: pagination.getSortDirectionInNumericFormat(),
      })
      .skip(pagination.getSkipItemsCount())
      .limit(pagination.pageSize);

    if (!comments) return null;

    const totalCount = await this.commentModel.countDocuments(filter);

    //retrieve comments' IDs to fetch all likes related to these comments
    const commentsIds = comments.map((comment: CommentDocument) =>
      comment._id.toString(),
    );
    const commentsLikes: CommentLikeDocument[] =
      await this.commentLikeModel.find({
        commentId: { $in: commentsIds },
      });

    //map the comments with likes and user status
    const items = await Promise.all(
      comments.map(async (comment: CommentDocument) => {
        //get all likes related to the current comment
        const commentLikes = commentsLikes.filter(
          (commentLike) => commentLike.commentId === comment._id.toString(),
        );

        //get user's reaction
        let myStatus = CommentLikeStatus.None;
        if (userId) {
          const userReaction = commentLikes.find(
            (commentLike) => commentLike.userId === userId,
          );

          if (userReaction) {
            myStatus = userReaction.status;
          }
        }

        //console.log(`Found user's like status, comment query repo: `, myStatus);
        return this.mapToOutput(comment, myStatus);
      }),
    );

    return new PaginationOutput<CommentViewModel>(
      items,
      pagination.pageNumber,
      pagination.pageSize,
      totalCount,
    );
  }
}
