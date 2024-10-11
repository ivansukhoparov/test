import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '../application/users.service';
import { UsersQueryRepository } from '../infrastructure/users.query.repository';
import { SortingPropertiesType } from '../../../base/types/sorting-properties.type';
import { UserViewModel } from './models/output/user.output.model';
import { PaginationWithSearchLoginAndEmailTerm } from '../../../base/models/pagination.base.model';
import { UserInputModel } from './models/input/create-user.input.model';
import { BasicAuthGuard } from '../../../common/guards/basic-auth.guard';

export const USERS_SORTING_PROPERTIES: SortingPropertiesType<UserViewModel> = [
  'login',
  'email',
];

@Controller('users')
@UseGuards(BasicAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersQueryRepository: UsersQueryRepository,
  ) {}

  @Post()
  async createUser(@Body() createModel: UserInputModel) {
    const { login, password, email } = createModel;

    const createdUserId = await this.usersService.createUser(
      login,
      password,
      email,
    );

    if (createdUserId === null) {
      throw new Error(`User was not created`);
    } else {
      const createdUser =
        await this.usersQueryRepository.getById(createdUserId);

      if (createdUser) {
        return createdUser;
      } else {
        throw new NotFoundException(`User was not found and mapped`);
      }
    }
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string) {
    const isDeleted: boolean = await this.usersService.delete(id);

    if (!isDeleted) {
      throw new NotFoundException(`User with id ${id} was not found`);
    }
  }

  @Get()
  async getAll(@Query() query: any) {
    const pagination: PaginationWithSearchLoginAndEmailTerm =
      new PaginationWithSearchLoginAndEmailTerm(
        query,
        USERS_SORTING_PROPERTIES,
      );

    const users = await this.usersQueryRepository.getAll(pagination);

    return users;
  }
}
