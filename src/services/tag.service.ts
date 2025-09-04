import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Tag } from '../entities/tag.entity';

@Injectable()
export class TagService {
  constructor(
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
  ) {}

  async create(createTagDto: { name: string; color?: string }): Promise<Tag> {
    const existingTag = await this.tagRepository.findOne({
      where: { name: createTagDto.name },
    });

    if (existingTag) {
      throw new ConflictException(`Tag with name "${createTagDto.name}" already exists`);
    }

    if (createTagDto.color && !this.isValidHexColor(createTagDto.color)) {
      throw new BadRequestException('Invalid color format. Must be a valid hex color (e.g., #FF5733)');
    }

    const tag = this.tagRepository.create({
      name: createTagDto.name,
      color: createTagDto.color || '#808080',
      usageCount: 0,
    });

    return await this.tagRepository.save(tag);
  }

  async findAll(search?: string): Promise<Tag[]> {
    const query = this.tagRepository.createQueryBuilder('tag');
    
    if (search) {
      query.where('tag.name LIKE :search', { search: `%${search}%` });
    }

    return await query
      .orderBy('tag.usageCount', 'DESC')
      .addOrderBy('tag.name', 'ASC')
      .getMany();
  }

  async findById(id: string): Promise<Tag> {
    const tag = await this.tagRepository.findOne({
      where: { id },
      relations: ['cronJobs'],
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID "${id}" not found`);
    }

    return tag;
  }

  async findByIds(ids: string[]): Promise<Tag[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    return await this.tagRepository.findBy({
      id: In(ids),
    });
  }

  async findByName(name: string): Promise<Tag | null> {
    return await this.tagRepository.findOne({
      where: { name },
    });
  }

  async searchByName(searchTerm: string, limit: number = 10): Promise<Tag[]> {
    return await this.tagRepository.find({
      where: { name: Like(`%${searchTerm}%`) },
      order: {
        usageCount: 'DESC',
        name: 'ASC',
      },
      take: limit,
    });
  }

  async update(id: string, updateTagDto: { name?: string; color?: string }): Promise<Tag> {
    const tag = await this.findById(id);

    if (updateTagDto.name && updateTagDto.name !== tag.name) {
      const existingTag = await this.tagRepository.findOne({
        where: { name: updateTagDto.name },
      });

      if (existingTag) {
        throw new ConflictException(`Tag with name "${updateTagDto.name}" already exists`);
      }
    }

    if (updateTagDto.color && !this.isValidHexColor(updateTagDto.color)) {
      throw new BadRequestException('Invalid color format. Must be a valid hex color (e.g., #FF5733)');
    }

    Object.assign(tag, updateTagDto);
    return await this.tagRepository.save(tag);
  }

  async delete(id: string): Promise<void> {
    const tag = await this.findById(id);
    await this.tagRepository.remove(tag);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) {
      return;
    }

    await this.tagRepository.delete(ids);
  }

  async incrementUsageCount(tagIds: string[]): Promise<void> {
    if (!tagIds || tagIds.length === 0) {
      return;
    }

    await this.tagRepository
      .createQueryBuilder()
      .update(Tag)
      .set({ usageCount: () => 'usageCount + 1' })
      .whereInIds(tagIds)
      .execute();
  }

  async decrementUsageCount(tagIds: string[]): Promise<void> {
    if (!tagIds || tagIds.length === 0) {
      return;
    }

    await this.tagRepository
      .createQueryBuilder()
      .update(Tag)
      .set({ usageCount: () => 'GREATEST(usageCount - 1, 0)' })
      .whereInIds(tagIds)
      .execute();
  }

  async getTagsWithJobCount(): Promise<Array<Tag & { jobCount: number }>> {
    const tags = await this.tagRepository
      .createQueryBuilder('tag')
      .loadRelationCountAndMap('tag.jobCount', 'tag.cronJobs')
      .orderBy('tag.usageCount', 'DESC')
      .addOrderBy('tag.name', 'ASC')
      .getMany();

    return tags as Array<Tag & { jobCount: number }>;
  }

  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    return await this.tagRepository.find({
      order: { usageCount: 'DESC' },
      take: limit,
    });
  }

  async createOrFindTags(tagNames: string[]): Promise<Tag[]> {
    if (!tagNames || tagNames.length === 0) {
      return [];
    }

    const tags: Tag[] = [];

    for (const name of tagNames) {
      let tag = await this.findByName(name);
      
      if (!tag) {
        tag = await this.create({ name, color: this.generateRandomColor() });
      }
      
      tags.push(tag);
    }

    return tags;
  }

  private isValidHexColor(color: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(color);
  }

  private generateRandomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B739', '#52B788', '#F72585', '#7209B7', '#3A0CA3',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}