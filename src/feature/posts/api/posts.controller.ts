import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SortingPropertiesType } from '../../../base/types/sorting-properties.type';
import {
  Pagination,
  PaginationWithSearchNameTerm,
} from '../../../base/models/pagination.base.model';
import { PostsQueryRepository } from '../../posts/infrastructure/posts.query.repository';
import { PostViewModel } from '../../posts/api/models/output/post.output.model';
import { PostInputModel } from './models/input/create-post.input.model';
import { PostsService } from '../application/posts.service';
import { BasicAuthGuard } from '../../../common/guards/basic-auth.guard';
import { AccessTokenAuthGuard } from '../../../common/guards/jwt-access-token-auth-guard';
import { CommentInputModel } from '../../comments/api/models/input/create-comment.input.model';
import { CommentViewModel } from '../../comments/api/models/output/comment.output.model';
import { Request } from 'express';
import { CommentsQueryRepository } from '../../comments/infrastucture/comments.query.repository';
import { CommentsService } from '../../comments/application/comments.service';
import { PostDocument } from '../domain/post.entity';
import { PostLikeInputModel } from '../post-likes/api/models/input/post-like.input.model';
import { AttachUserIdGuard } from '../../../common/guards/access-token-userId-guard';

export const POSTS_SORTING_PROPERTIES: SortingPropertiesType<PostViewModel> = [
  'createdAt',
  'blogName', //TODO: why blogName?
];
export const COMMENTS_SORTING_PROPERTIES: SortingPropertiesType<CommentViewModel> =
  ['createdAt'];

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly postsQueryRepository: PostsQueryRepository,
    private readonly commentsService: CommentsService,
    private readonly commentsQueryRepository: CommentsQueryRepository,
  ) {}

  //TODO:what about if smth could not be executed or could not be found? how do I go around the errors? POST post & POST comment
  @Post()
  @UseGuards(BasicAuthGuard)
  async createPost(
    @Body() createModel: PostInputModel,
  ): Promise<PostViewModel> {
    const { blogId, title, shortDescription, content } = createModel;

    const createdPostId = await this.postsService.createPost(
      blogId,
      title,
      shortDescription,
      content,
    );

    if (!createdPostId) {
      throw new NotFoundException(`Post was not created`); //TODO: what if no blog found? throw new Error()
    } else {
      const createdPost = await this.postsQueryRepository.getPostById(
        createdPostId,
        null,
      );

      if (createdPost) {
        return createdPost;
      } else {
        throw new NotFoundException(`Post was not found and mapped`);
      }
    }
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(BasicAuthGuard)
  async updatePost(
    @Param('id') id: string,
    @Body() updateModel: PostInputModel,
  ): Promise<void> {
    const isUpdated: boolean = await this.postsService.updatePost(
      id,
      updateModel,
    );

    if (!isUpdated) {
      throw new NotFoundException(
        `Post with id ${id} was not found for updating`,
      );
    }
  }

  @UseGuards(AttachUserIdGuard)
  @Get(':id')
  async getPostById(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<PostViewModel> {
    //console.log('User ID from req GET(:id): ', req.userId);

    const post: PostViewModel | null =
      await this.postsQueryRepository.getPostById(id, req.userId);

    if (!post) {
      throw new NotFoundException(`Post with id ${id} was not found`);
    }

    return post;
  }

  @Get()
  @UseGuards(AttachUserIdGuard)
  async getAllPosts(@Query() query: any, @Req() req: Request) {
    //console.log(query);

    const pagination: PaginationWithSearchNameTerm =
      new PaginationWithSearchNameTerm(query, POSTS_SORTING_PROPERTIES);
    //console.log(pagination);

    console.log('User ID from req GET(): ', req.userId);
    const posts = await this.postsQueryRepository.getAllPosts(
      pagination,
      req.userId,
    );

    if (!posts) {
      throw new NotFoundException(`Posts were not found`);
    } else {
      return posts;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(BasicAuthGuard)
  async deletePost(@Param('id') id: string) {
    const isDeleted: boolean = await this.postsService.deletePost(id);

    if (!isDeleted) {
      throw new NotFoundException(
        `Post with id ${id} was not found for deletion`,
      );
    }
  }

  @Put(':postId/like-status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenAuthGuard)
  async likeStatus(
    @Param('postId') postId: string,
    @Req() req: Request,
    @Body() inputModel: PostLikeInputModel,
  ) {
    //console.log(`User ID from req Put(':postId/like-status): `, req.userId);
    const { likeStatus } = inputModel;
    const isLikeStatusUpdated = await this.postsService.updateLikeStatus(
      req.userId!,
      postId,
      likeStatus,
    );

    if (!isLikeStatusUpdated) {
      throw new NotFoundException(
        `Post with id ${postId} was not found to update its status`,
      );
    }
  }

  //COMMENTS
  //TODO: userId from guard, remove '!'
  @Post(':postId/comments')
  @UseGuards(AccessTokenAuthGuard)
  async createCommentByPostId(
    @Param('postId') postId: string,
    @Body() createModel: CommentInputModel,
    @Req() req: Request,
  ): Promise<CommentViewModel> {
    const { content } = createModel;
    const userId = req.userId;
    //console.log(`User ID from req Post(':postId/comments): `, req.userId);

    const existingPost = await this.postsService.doesPostExist(postId);

    if (!existingPost) {
      throw new NotFoundException(
        `Post with id ${postId} for comment creation was not found`,
      );
    } else {
      const newCommentId: string | null =
        await this.commentsService.createCommentByPostId(
          content,
          postId,
          userId!,
        );

      if (!newCommentId) {
        throw new Error(`Comment for post with id ${postId} was not created`);
      } else {
        const savedComment: CommentViewModel | null =
          await this.commentsQueryRepository.getCommentById(
            newCommentId,
            userId,
          );

        if (!savedComment) {
          throw new NotFoundException('Comment was not found');
        } else {
          return savedComment;
        }
      }
    }
  }

  @Get(':postId/comments')
  @UseGuards(AttachUserIdGuard)
  async getAllCommentsByPostId(
    @Param('postId') postId: string,
    @Req() req: Request,
    @Query() query: any,
  ) {
    const existingPost: PostDocument | null =
      await this.postsService.doesPostExist(postId);

    if (!existingPost) {
      throw new NotFoundException(
        `Post with id ${postId} to get all of its comments was not found`,
      );
    } else {
      const pagination = new Pagination(query, COMMENTS_SORTING_PROPERTIES);

      //console.log(`User ID from req GET(':postId/comments): `, req.userId);
      const comments = await this.commentsQueryRepository.getCommentsByPostsId(
        pagination,
        req.userId,
        postId,
      );

      if (!comments) {
        throw new NotFoundException(
          `Comments for post with id ${postId} were not found`,
        );
      } else {
        return comments;
      }
    }
  }
}
