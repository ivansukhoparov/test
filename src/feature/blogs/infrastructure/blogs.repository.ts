import { Injectable } from '@nestjs/common';
import { Blog, BlogDocument, BlogModelType } from '../domain/blog.entity';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { BlogInputModel } from '../api/models/input/create-blog.input.model';
import {
  Post,
  PostDocument,
  PostModelType,
} from '../../posts/domain/post.entity';

@Injectable()
export class BlogsRepository {
  constructor(
    @InjectModel(Blog.name) private blogModel: BlogModelType,
    @InjectModel(Post.name) private postModel: PostModelType,
  ) {}

  //TODO: question in createBlog and createPost
  async createBlog(blogDTO: Blog): Promise<string | null> {
    try {
      //TODO:what's the type here?
      const createdBlog = new this.blogModel(blogDTO);

      const result: BlogDocument = await createdBlog.save();

      return result._id.toString();
    } catch (error) {
      console.log(error, 'unable to create a new blog, repo');
      return null;
    }
  }

  async findBlogById(id: string): Promise<BlogDocument | null> {
    const blog: BlogDocument | null = await this.blogModel.findOne({
      _id: new ObjectId(id),
    });

    if (blog) {
      return blog;
    } else {
      return null;
    }
  }

  async updateBlog(id: string, blogDTO: BlogInputModel): Promise<boolean> {
    try {
      const result = await this.blogModel.updateOne(
        { _id: new ObjectId(id) },
        { $set: blogDTO },
      );

      return result.matchedCount === 1 && result.modifiedCount === 1;
      //1 = true, 0 === false
    } catch (err) {
      console.error(err, 'unable to update the blog, repo');
      return false;
    }
  }

  async deleteBlog(id: string): Promise<boolean> {
    const deletionResult = await this.blogModel.deleteOne({
      _id: new ObjectId(id),
    });

    return deletionResult.deletedCount === 1;
  }

  async createPostByBlogId(postDTO: Post): Promise<string | null> {
    //TODO:what's the type here?
    const createdPost = new this.postModel(postDTO);

    const result: PostDocument = await createdPost.save();

    if (result) {
      return result._id.toString();
    } else {
      return null;
    }
  }
}
