import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { Post, PostDocument } from '../../posts/domain/post.entity';
import { PostInputModel } from '../api/models/input/create-post.input.model';
import { BlogDocument } from '../../blogs/domain/blog.entity';
import { PostsRepository } from '../infrastructure/posts.repository';
import { BlogsRepository } from '../../blogs/infrastructure/blogs.repository';
import { PostLikeStatus } from '../post-likes/api/models/input/post-like.input.model';
import {
  PostLike,
  PostLikeDocument,
} from '../post-likes/domain/post-like.entity';
import { PostLikesRepository } from '../post-likes/infrastructure/post-likes.repository';
import { UsersRepository } from '../../users/infrastructure/users.repository';

@Injectable()
export class PostsService {
  constructor(
    private readonly postsRepository: PostsRepository,
    private readonly blogsRepository: BlogsRepository,
    private readonly postLikesRepository: PostLikesRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async createPost(
    blogId: string,
    title: string,
    shortDescription: string,
    content: string,
  ): Promise<string | null> {
    const blog: BlogDocument | null =
      await this.blogsRepository.findBlogById(blogId);
    if (!blog) return null;

    const newPost: Post = {
      _id: new ObjectId(),
      title: title,
      shortDescription: shortDescription,
      content: content,
      blogId: blogId,
      blogName: blog.name,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      dislikesCount: 0,
    };

    return await this.postsRepository.createPost(newPost);
  }

  async updatePost(id: string, updateModel: PostInputModel): Promise<boolean> {
    const existingPost: PostDocument | null =
      await this.postsRepository.findPostById(id);

    if (existingPost === null) return false;

    return await this.postsRepository.updatePost(id, updateModel);
  }

  async deletePost(id: string): Promise<boolean> {
    const existingPost: PostDocument | null =
      await this.postsRepository.findPostById(id);

    if (existingPost === null) return false;

    return await this.postsRepository.deletePost(id);
  }

  async doesPostExist(id: string): Promise<PostDocument | null> {
    const existingPost: PostDocument | null =
      await this.postsRepository.findPostById(id);

    if (!existingPost) return null;

    return existingPost;
  }

  async updateLikeDislikeCount(
    postId: string,
    likeStatus: PostLikeStatus,
    userId: string,
  ): Promise<boolean> {
    const like: PostLikeDocument | null =
      await this.postLikesRepository.findLikeByUserIdAndPostId(userId, postId);

    let likeIncrement = 0;
    let dislikeIncrement = 0;

    //increment or decrement based on the new like status
    if (likeStatus === PostLikeStatus.Like) {
      likeIncrement = 1;
      dislikeIncrement = like?.status === PostLikeStatus.Dislike ? -1 : 0;
    } else if (likeStatus === PostLikeStatus.Dislike) {
      dislikeIncrement = 1;
      likeIncrement = like?.status === PostLikeStatus.Like ? -1 : 0;
    } else if (likeStatus === PostLikeStatus.None && like) {
      if (like.status === PostLikeStatus.Like) {
        likeIncrement = -1;
      } else if (like.status === PostLikeStatus.Dislike) {
        dislikeIncrement = -1;
      }
    }

    try {
      return await this.postsRepository.updateLikeDislikeCount(
        postId,
        likeIncrement,
        dislikeIncrement,
      );
    } catch (error) {
      console.error(
        error,
        'Could not update like/dislike count of posts, service',
      );
      return false;
    }
  }

  async updateLikeStatus(
    userId: string,
    postId: string,
    likeStatus: PostLikeStatus,
  ): Promise<boolean> {
    try {
      const post: PostDocument | null =
        await this.postsRepository.findPostById(postId);
      //console.log('Found post: ', post);
      if (!post) return false;

      const like: PostLikeDocument | null =
        await this.postLikesRepository.findLikeByUserIdAndPostId(
          userId,
          postId,
        );
      //console.log('Found like: ', like); //COMMENT OUT

      //if like exists and new status is the same AND/OR if like doesn't exist and new status is None, return early
      if (
        (like && likeStatus === like.status) ||
        (!like && likeStatus === PostLikeStatus.None)
      ) {
        return true;
      }

      //console.log('USER ID FROM REQ: ', userId); //COMMENT OUT
      //console.log('LIKE STATUS FROM BODY: ', likeStatus); //COMMENT OUT

      await this.updateLikeDislikeCount(postId, likeStatus, userId);
      //console.log('Was dis/like count updated?  ', updatedDisLikeCount); //COMMENT OUT

      if (like) {
        await this.postLikesRepository.updateLikeOrDislike(
          like._id.toString(),
          likeStatus,
        );
        //console.log('Was status updated? ', a); //COMMENT OUT
      } else {
        const user = await this.usersRepository.findById(userId);
        //console.log('Found user: ', user); //COMMENT OUT
        if (!user) return false;

        const newLike: PostLike = {
          _id: new ObjectId(),
          userId: userId,
          postId: postId,
          status: likeStatus,
          addedAt: new Date().toISOString(),
          login: user.login,
        };
        await this.postLikesRepository.createLikeOrDislike(newLike);
        //console.log('Created like: ', b); ////COMMENT OUT
      }

      return true;
    } catch (error) {
      console.error('Error updating postLike status, service:', error);
      return false;
    }
  }
}
