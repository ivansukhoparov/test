import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Blog, BlogDocument, BlogModelType } from '../domain/blog.entity';
import {
  BlogViewModel,
  BlogOutputModelMapper,
} from '../api/models/output/blog.output.model';
import { FilterQuery } from 'mongoose';
import {
  Pagination,
  PaginationOutput,
  PaginationWithSearchNameTerm,
} from '../../../base/models/pagination.base.model';
import { ObjectId } from 'mongodb';
import { PostViewModel } from '../../posts/api/models/output/post.output.model';
import {
  Post,
  PostDocument,
  PostModelType,
} from '../../posts/domain/post.entity';
import {
  PostLike,
  PostLikeDocument,
  PostLikeModelType,
} from '../../posts/post-likes/domain/post-like.entity';
import { PostLikeStatus } from '../../posts/post-likes/api/models/input/post-like.input.model';
import { LikeDetailsViewModel } from '../../posts/post-likes/api/models/output/post-like.output.model';

@Injectable()
export class BlogsQueryRepository {
  constructor(
    @InjectModel(Blog.name) private blogModel: BlogModelType,
    @InjectModel(Post.name) private postModel: PostModelType,
    @InjectModel(PostLike.name) private postLikeModel: PostLikeModelType,
  ) {}

  //BLOGS
  mapToOutput(blog: BlogDocument): BlogViewModel {
    return {
      id: blog._id.toString(),
      name: blog.name,
      description: blog.description,
      websiteUrl: blog.websiteUrl,
      createdAt: blog.createdAt,
      isMembership: blog.isMembership,
    };
  }

  async getBlogById(id: string): Promise<BlogViewModel | null> {
    const blog: BlogDocument | null = await this.blogModel.findOne({
      _id: new ObjectId(id),
    });

    if (blog === null) {
      return null;
    }

    //return UserOutputModelMapper(user);
    return this.mapToOutput(blog);
  }

  async getAllBlogs(
    pagination: PaginationWithSearchNameTerm,
  ): Promise<PaginationOutput<BlogViewModel>> {
    const filters: FilterQuery<Blog>[] = [];

    if (pagination.searchNameTerm) {
      filters.push({
        name: { $regex: pagination.searchNameTerm, $options: 'i' },
      });
    }

    const filter: FilterQuery<Blog> = {};

    if (filters.length > 0) {
      filter.$or = filters;
    }

    return await this.__getResult(filter, pagination);
  }

  private async __getResult(
    filter: FilterQuery<Blog>,
    pagination: PaginationWithSearchNameTerm,
  ): Promise<PaginationOutput<BlogViewModel>> {
    const blogs = await this.blogModel
      .find(filter)
      .sort({
        [pagination.sortBy]: pagination.getSortDirectionInNumericFormat(),
      })
      .skip(pagination.getSkipItemsCount())
      .limit(pagination.pageSize);

    const totalCount = await this.blogModel.countDocuments(filter);

    const mappedBlogs = blogs.map(BlogOutputModelMapper);

    return new PaginationOutput<BlogViewModel>(
      mappedBlogs,
      pagination.pageNumber,
      pagination.pageSize,
      totalCount,
    );
  }

  //POSTS
  postMapToOutput(
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

  async getPostsByBlogId(
    pagination: Pagination,
    id: string,
    userId: string | null,
  ): Promise<PaginationOutput<PostViewModel> | null> {
    const filters: FilterQuery<Post>[] = [];

    /*if (pagination.searchNameTerm) {
      filters.push({
        name: { $regex: pagination.searchNameTerm, $options: 'i' },
      });
    }*/

    const filter: FilterQuery<Post> = { blogId: id };

    if (filters.length > 0) {
      filter.$or = filters;
    }

    return await this.__getResultPost(filter, pagination, userId);
  }

  private async __getResultPost(
    filter: FilterQuery<Post>,
    pagination: Pagination,
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

        return this.postMapToOutput(post, newestLikesMapped, myStatus);
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
