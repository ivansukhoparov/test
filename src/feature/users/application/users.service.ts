import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../infrastructure/users.repository';
import { CryptoService } from '../../../common/utils/adapters/crypto.service';
import { User, UserDocument } from '../domain/user.entity';
import { ObjectId } from 'mongodb';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly cryptoService: CryptoService,
  ) {}

  async createUser(
    login: string,
    password: string,
    email: string,
  ): Promise<string | null> {
    const generatedPasswordHash =
      await this.cryptoService._generateHash(password);

    const newUser: User = {
      //Omit<'_id'>
      _id: new ObjectId(),
      login: login,
      passwordHash: generatedPasswordHash,
      email: email,
      createdAt: new Date().toISOString(),
      isConfirmed: true,
    };

    return await this.usersRepository.createUser(newUser);
  }

  async delete(id: string): Promise<boolean> {
    const existingUser: UserDocument | null =
      await this.usersRepository.findById(id);

    if (existingUser === null) return false; //don't need this line, if 'findEntityByIdOrNotFoundError(id)' repo method was used above

    return await this.usersRepository.deleteUser(id);
  }
}
