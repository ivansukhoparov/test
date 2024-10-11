import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, UserModelType } from '../domain/user.entity';
import {
  UserViewModel,
  UserOutputModelMapper,
} from '../api/models/output/user.output.model';
import { FilterQuery } from 'mongoose';
import {
  PaginationOutput,
  PaginationWithSearchLoginAndEmailTerm,
} from '../../../base/models/pagination.base.model';
import { ObjectId } from 'mongodb';

@Injectable()
export class UsersQueryRepository {
  constructor(@InjectModel(User.name) private userModel: UserModelType) {}

  mapToOutput(user: UserDocument): UserViewModel {
    return {
      id: user._id.toString(),
      login: user.login,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  async getById(id: string): Promise<UserViewModel | null> {
    const user: UserDocument | null = await this.userModel.findOne({
      _id: new ObjectId(id),
    });

    if (user === null) {
      return null;
    }

    //return UserOutputModelMapper(user);
    return this.mapToOutput(user);
  }

  async getAll(
    pagination: PaginationWithSearchLoginAndEmailTerm,
  ): Promise<PaginationOutput<UserViewModel>> {
    const filters: FilterQuery<User>[] = [];

    if (pagination.searchEmailTerm) {
      filters.push({
        email: { $regex: pagination.searchEmailTerm, $options: 'i' },
      });
    }

    if (pagination.searchLoginTerm) {
      filters.push({
        login: { $regex: pagination.searchLoginTerm, $options: 'i' },
      });
    }

    const filter: FilterQuery<User> = {};

    if (filters.length > 0) {
      filter.$or = filters;
    }

    return await this.__getResult(filter, pagination);
  }

  private async __getResult(
    filter: FilterQuery<User>,
    pagination: PaginationWithSearchLoginAndEmailTerm,
  ): Promise<PaginationOutput<UserViewModel>> {
    const users = await this.userModel
      .find(filter)
      .sort({
        [pagination.sortBy]: pagination.getSortDirectionInNumericFormat(),
      })
      .skip(pagination.getSkipItemsCount())
      .limit(pagination.pageSize);

    const totalCount = await this.userModel.countDocuments(filter);

    const mappedPosts = users.map(UserOutputModelMapper);

    return new PaginationOutput<UserViewModel>(
      mappedPosts,
      pagination.pageNumber,
      pagination.pageSize,
      totalCount,
    );
  }
}
