import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser } from '../entities/admin-user.entity.js';

@Injectable()
export class AdminUserRepository {
  constructor(
    @InjectRepository(AdminUser)
    private readonly repository: Repository<AdminUser>,
  ) {}

  async findById(id: string): Promise<AdminUser | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByUsername(username: string): Promise<AdminUser | null> {
    return this.repository.findOne({ where: { username } });
  }

  async findByEmail(email: string): Promise<AdminUser | null> {
    return this.repository.findOne({ where: { email } });
  }

  async create(adminUser: Partial<AdminUser>): Promise<AdminUser> {
    const newAdminUser = this.repository.create(adminUser);
    return this.repository.save(newAdminUser);
  }

  async update(
    id: string,
    updates: Partial<AdminUser>,
  ): Promise<AdminUser | null> {
    await this.repository.update(id, updates);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async findAll(): Promise<AdminUser[]> {
    return this.repository.find();
  }
}
