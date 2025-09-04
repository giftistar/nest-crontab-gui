import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TagService } from '../services/tag.service';
import { Tag } from '../entities/tag.entity';
import { CreateTagDto, UpdateTagDto } from '../dto/tag.dto';

@Controller('api/tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  @UsePipes(new ValidationPipe())
  async create(@Body() createTagDto: CreateTagDto): Promise<Tag> {
    return await this.tagService.create(createTagDto);
  }

  @Get()
  async findAll(@Query('search') search?: string): Promise<Tag[]> {
    return await this.tagService.findAll(search);
  }

  @Get('popular')
  async getPopularTags(@Query('limit') limit: string = '10'): Promise<Tag[]> {
    return await this.tagService.getPopularTags(parseInt(limit, 10));
  }

  @Get('with-counts')
  async getTagsWithJobCount(): Promise<Array<Tag & { jobCount: number }>> {
    return await this.tagService.getTagsWithJobCount();
  }

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('limit') limit: string = '10',
  ): Promise<Tag[]> {
    if (!query) {
      return [];
    }
    return await this.tagService.searchByName(query, parseInt(limit, 10));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Tag> {
    return await this.tagService.findById(id);
  }

  @Put(':id')
  @UsePipes(new ValidationPipe())
  async update(
    @Param('id') id: string,
    @Body() updateTagDto: UpdateTagDto,
  ): Promise<Tag> {
    return await this.tagService.update(id, updateTagDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.tagService.delete(id);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async bulkDelete(@Body('ids') ids: string[]): Promise<void> {
    await this.tagService.bulkDelete(ids);
  }

  @Post('create-or-find')
  async createOrFind(@Body('names') names: string[]): Promise<Tag[]> {
    return await this.tagService.createOrFindTags(names);
  }
}