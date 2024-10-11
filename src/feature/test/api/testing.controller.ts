import {
  Controller,
  Delete,
  HttpCode,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';

@Controller('testing')
export class TestingController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Delete('all-data')
  @HttpCode(204)
  async deleteAllData(): Promise<void> {
    try {
      if (!this.connection.db) {
        throw new HttpException(
          'Database connection is not established',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const collections = await this.connection.db.collections();

      if (!collections || collections.length === 0) {
        console.log('No collections found in the database');
        return;
      }

      for (const collection of collections) {
        await this.connection.db.dropCollection(collection.collectionName);
        console.log(`Dropped collection: ${collection.collectionName}`);
      }

      console.log('Database cleanup complete.');
    } catch (error) {
      console.error('Error dropping collections:', error);
      throw new HttpException(
        'Error cleaning up database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
