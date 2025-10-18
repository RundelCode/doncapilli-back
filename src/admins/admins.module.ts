import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Admin])],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class AdminsModule {}
