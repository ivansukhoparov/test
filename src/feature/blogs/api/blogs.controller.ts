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
import { BlogViewModel } from './models/output/blog.output.model';
import { BlogInputModel } from './models/input/create-blog.input.model';
import {
  Pagination,
  PaginationWithSearchNameTerm,
} from '../../../base/models/pagination.base.model';
import { BlogsService } from '../application/blogs.service';
import { BlogsQueryRepository } from '../infrastructure/blogs.query.repository';
import { BlogPostInputModel } from './models/input/create-post-by-blogId.input.model';
import { PostsQueryRepository } from '../../posts/infrastructure/posts.query.repository';
import { PostViewModel } from '../../posts/api/models/output/post.output.model';
import { BasicAuthGuard } from '../../../common/guards/basic-auth.guard';
import { PostsService } from '../../posts/application/posts.service';
import { Request } from 'express';
import { AttachUserIdGuard } from '../../../common/guards/access-token-userId-guard';

export const BLOGS_SORTING_PROPERTIES: SortingPropertiesType<BlogViewModel> = [
  'name',
];
export const POSTS_SORTING_PROPERTIES: SortingPropertiesType<PostViewModel> = [
  'createdAt',
];

@Controller('blogs')
export class BlogsController {
  constructor(
    private readonly blogsService: BlogsService,
    private readonly blogsQueryRepository: BlogsQueryRepository,
    private readonly postsService: PostsService,
    private readonly postsQueryRepository: PostsQueryRepository,
  ) {}

  @Post()
  @UseGuards(BasicAuthGuard)
  async createBlog(
    @Body() createModel: BlogInputModel,
  ): Promise<BlogViewModel> {
    const createdBlogId = await this.blogsService.createBlog(createModel);

    if (!createdBlogId) {
      throw new Error(`Blog was not created`);
    } else {
      const createdBlog =
        await this.blogsQueryRepository.getBlogById(createdBlogId);

      if (createdBlog) {
        return createdBlog;
      } else {
        throw new NotFoundException(`Blog was not found and mapped`);
      }
    }
  }

  @Put(':id')
  @HttpCode(204)
  @UseGuards(BasicAuthGuard)
  async updateBlog(
    @Param('id') id: string,
    @Body() updateModel: BlogInputModel,
  ) {
    const isUpdated: boolean = await this.blogsService.updateBlog(
      id,
      updateModel,
    );

    if (!isUpdated) {
      throw new NotFoundException(`Blog with id ${id} not found`);
    }
  }

  @Get(':id')
  async getBlogById(@Param('id') id: string): Promise<BlogViewModel> {
    const blog: BlogViewModel | null =
      await this.blogsQueryRepository.getBlogById(id);

    if (!blog) {
      throw new NotFoundException(`Blog with id ${id} not found`);
    }

    return blog;
  }

  @Get()
  async getAllBlogs(@Query() query: any) {
    const pagination: PaginationWithSearchNameTerm =
      new PaginationWithSearchNameTerm(query, BLOGS_SORTING_PROPERTIES);

    const blogs = await this.blogsQueryRepository.getAllBlogs(pagination);

    return blogs;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(BasicAuthGuard)
  async deleteBlog(@Param('id') id: string) {
    const isDeleted: boolean = await this.blogsService.deleteBlog(id);

    if (!isDeleted) {
      throw new NotFoundException(`Blog with id ${id} not found`);
    }
  }

  @Post(':id/posts')
  @UseGuards(BasicAuthGuard)
  async createPostByBlogId(
    @Param('id') id: string,
    @Body() createModel: BlogPostInputModel,
  ) {
    const blog: boolean = await this.blogsService.doesBlogExist(id);

    if (!blog) {
      throw new NotFoundException(`Blog for posts with id ${id} not found`);
    }

    const newPostId: string | null = await this.postsService.createPost(
      id,
      createModel.title,
      createModel.shortDescription,
      createModel.content,
    );

    if (!newPostId) {
      throw new Error(`Post for blog with blogId ${id} was not created`);
    } else {
      const savedPost = await this.postsQueryRepository.getPostById(
        newPostId,
        null,
      );

      if (savedPost) {
        return savedPost;
      } else {
        throw new NotFoundException(
          `Post for blog with blogId ${id} was not found and mapped`,
        );
      }
    }
  }

  @Get(':id/posts')
  @UseGuards(AttachUserIdGuard)
  async getPostsByBlogId(
    @Query() query: any,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const blog: boolean = await this.blogsService.doesBlogExist(id);

    if (!blog) {
      throw new NotFoundException(`Blog for posts with id ${id} not found`);
    } else {
      const pagination: Pagination = new Pagination(
        query,
        POSTS_SORTING_PROPERTIES,
      );

      const posts = await this.blogsQueryRepository.getPostsByBlogId(
        pagination,
        id,
        req.userId,
      );

      if (!posts) {
        throw new NotFoundException(
          `Posts w/ pagination by blogId with id ${id} not found`,
        );
      } else {
        return posts;
      }
    }
  }
}
