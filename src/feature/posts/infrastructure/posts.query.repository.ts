import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import {
  PaginationOutput,
  PaginationWithSearchNameTerm,
} from '../../../base/models/pagination.base.model';
import { FilterQuery } from 'mongoose';
import { Post, PostDocument, PostModelType } from '../domain/post.entity';
import { PostViewModel } from '../api/models/output/post.output.model';
import { LikeDetailsViewModel } from '../post-likes/api/models/output/post-like.output.model';
import { PostLikeStatus } from '../post-likes/api/models/input/post-like.input.model';
import {
  PostLike,
  PostLikeDocument,
  PostLikeModelType,
} from '../post-likes/domain/post-like.entity';

@Injectable()
export class PostsQueryRepository {
  constructor(
    @InjectModel(Post.name) private postModel: PostModelType,
    @InjectModel(PostLike.name) private postLikeModel: PostLikeModelType,
  ) {}

  mapToOutput(
    post: PostDocument,
    threePostLikes: LikeDetailsViewModel[],
    myStatus: PostLikeStatus,
  ): PostViewModel {
    return {
      id: post._id.toString(),
      title: post.title,
      shortDescription: post.shortDescription,
      content: post.content,
      blogId: post.blogId,
      blogName: post.blogName,
      createdAt: post.createdAt,
      extendedLikesInfo: {
        likesCount: post.likesCount,
        dislikesCount: post.dislikesCount,
        myStatus: myStatus,
        newestLikes: threePostLikes,
      },
    };
  }

  async getPostById(
    id: string,
    userId: string | null,
  ): Promise<PostViewModel | null> {
    const post: PostDocument | null = await this.postModel.findOne({
      _id: new ObjectId(id),
    });
    if (post === null) {
      return null;
    }

    //get the 3 newest likes for the post
    const newestLikes: PostLikeDocument[] = await this.postLikeModel
      .find({
        postId: post._id.toString(),
        status: PostLikeStatus.Like,
      })
      .sort({ addedAt: -1 })
      .limit(3);
    //map newestLikes
    const newestLikesMapped: LikeDetailsViewModel[] = newestLikes.map(
      (like: PostLikeDocument) => ({
        addedAt: like.addedAt,
        userId: like.userId,
        login: like.login,
      }),
    );

    //determine the current user's like status for this post
    let myStatus: PostLikeStatus = PostLikeStatus.None;
    if (userId) {
      const myReaction: PostLikeDocument | null =
        await this.postLikeModel.findOne({
          userId: userId,
          postId: post._id.toString(),
        });
      if (myReaction) {
        myStatus = myReaction.status;
      }
    }

    //map the DB model to PostViewModel
    return this.mapToOutput(post, newestLikesMapped, myStatus);
  }

  async getAllPosts(
    pagination: PaginationWithSearchNameTerm,
    userId: string | null,
  ): Promise<PaginationOutput<PostViewModel> | null> {
    const filters: FilterQuery<Post>[] = [];

    if (pagination.searchNameTerm) {
      filters.push({
        name: { $regex: pagination.searchNameTerm, $options: 'i' },
      });
    }
    //console.log(pagination);

    const filter: FilterQuery<Post> = {};

    if (filters.length > 0) {
      filter.$or = filters;
    }

    return await this.__getResult(filter, pagination, userId);
  }

  private async __getResult(
    filter: FilterQuery<Post>,
    pagination: PaginationWithSearchNameTerm,
    userId: string | null,
  ): Promise<PaginationOutput<PostViewModel> | null> {
    const posts = await this.postModel
      .find(filter)
      .sort({
        [pagination.sortBy]: pagination.getSortDirectionInNumericFormat(),
      })
      .skip(pagination.getSkipItemsCount())
      .limit(pagination.pageSize);
    if (!posts) return null;

    const totalCount = await this.postModel.countDocuments(filter);

    //retrieve post IDs to fetch all likes related to these posts
    const postsIds = posts.map((post: PostDocument) => post._id.toString());
    const postsLikes: PostLikeDocument[] = await this.postLikeModel.find({
      postId: { $in: postsIds },
    });

    //map the posts with likes and user status
    const items = await Promise.all(
      posts.map(async (post: PostDocument) => {
        //get all likes related to the current post
        const postLikes = postsLikes.filter(
          (postLike) => postLike.postId === post._id.toString(),
        );

        //get user's reaction
        let myStatus = PostLikeStatus.None;
        if (userId) {
          const userReaction = postLikes.find(
            (postLike) => postLike.userId === userId,
          );
          if (userReaction) {
            myStatus = userReaction.status;
          }
        }

        //get the 3 newest likes for the post
        const newestLikes: PostLikeDocument[] = await this.postLikeModel
          .find({
            postId: post._id.toString(),
            status: PostLikeStatus.Like,
          })
          .sort({ addedAt: -1 })
          .limit(3);

        //map newestLikes
        const newestLikesMapped: LikeDetailsViewModel[] = newestLikes.map(
          (like: PostLikeDocument) => ({
            addedAt: like.addedAt,
            userId: like.userId,
            login: like.login,
          }),
        );

        return this.mapToOutput(post, newestLikesMapped, myStatus);
      }),
    );

    return new PaginationOutput<PostViewModel>(
      items,
      pagination.pageNumber,
      pagination.pageSize,
      totalCount,
    );
  }
}
