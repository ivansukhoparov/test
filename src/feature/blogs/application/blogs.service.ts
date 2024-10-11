import { Injectable } from '@nestjs/common';
import { BlogsRepository } from '../infrastructure/blogs.repository';
import { Blog, BlogDocument } from '../domain/blog.entity';
import { ObjectId } from 'mongodb';
import { BlogInputModel } from '../api/models/input/create-blog.input.model';
import { BlogPostInputModel } from '../api/models/input/create-post-by-blogId.input.model';
import { Post } from '../../posts/domain/post.entity';

@Injectable()
export class BlogsService {
  constructor(private readonly blogsRepository: BlogsRepository) {}

  async doesBlogExist(id: string) {
    const blog: BlogDocument | null =
      await this.blogsRepository.findBlogById(id);

    if (!blog) return false;

    return true;
  }

  async createBlog(createModel: BlogInputModel): Promise<string | null> {
    const newBlog: Blog = {
      _id: new ObjectId(),
      name: createModel.name,
      description: createModel.description,
      websiteUrl: createModel.websiteUrl,
      createdAt: new Date().toISOString(),
      isMembership: false,
    };

    return await this.blogsRepository.createBlog(newBlog);
  }

  async updateBlog(id: string, updateModel: BlogInputModel): Promise<boolean> {
    const existingBlog: BlogDocument | null =
      await this.blogsRepository.findBlogById(id);

    if (existingBlog === null) return false;

    return await this.blogsRepository.updateBlog(id, updateModel);
  }

  async deleteBlog(id: string): Promise<boolean> {
    const existingBlog: BlogDocument | null =
      await this.blogsRepository.findBlogById(id);

    if (existingBlog === null) return false;

    return await this.blogsRepository.deleteBlog(id);
  }

  async createPostByBlogId(
    id: string,
    createModel: BlogPostInputModel,
  ): Promise<string | null> {
    const blog: BlogDocument | null =
      await this.blogsRepository.findBlogById(id);

    if (!blog) return null;

    const newPost: Post = {
      _id: new ObjectId(),
      title: createModel.title,
      shortDescription: createModel.shortDescription,
      content: createModel.content,
      blogId: id,
      blogName: blog.name,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      dislikesCount: 0,
    };

    return await this.blogsRepository.createPostByBlogId(newPost);
  }
}
