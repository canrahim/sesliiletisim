import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  Request,
} from '@nestjs/common';
import { ServerService } from './server.service';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { AddMemberDto, UpdateMemberRoleDto, CreateInviteDto } from './dto/server-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('servers')
@UseGuards(JwtAuthGuard)
export class ServerController {
  constructor(private readonly serverService: ServerService) {}

  @Post()
  create(
    @CurrentUser() user: any,
    @Body() createServerDto: CreateServerDto
  ) {
    return this.serverService.create(user.id, createServerDto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.serverService.findAll(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.serverService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateServerDto: UpdateServerDto
  ) {
    return this.serverService.update(id, user.id, updateServerDto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.serverService.remove(id, user.id);
  }

  // Join server by invite code
  @Post('join/:inviteCode')
  joinByInvite(
    @Param('inviteCode') inviteCode: string,
    @CurrentUser() user: any
  ) {
    return this.serverService.joinByInvite(inviteCode, user.id);
  }

  // Leave server
  @Post(':id/leave')
  leave(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.serverService.leave(id, user.id);
  }

  // Member management
  @Get(':id/members')
  getMembers(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.serverService.getMembers(id, user.id);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() addMemberDto: AddMemberDto
  ) {
    return this.serverService.addMember(id, user.id, addMemberDto);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any
  ) {
    return this.serverService.removeMember(id, user.id, memberId);
  }

  @Patch(':id/members/:memberId/role')
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto
  ) {
    return this.serverService.updateMemberRole(id, user.id, memberId, updateMemberRoleDto.role);
  }

  // Generate invite
  @Post(':id/invite')
  generateInvite(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() createInviteDto: CreateInviteDto
  ) {
    return this.serverService.generateInvite(id, user.id, createInviteDto);
  }
}
