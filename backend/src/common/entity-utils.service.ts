import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EntityManager, EntityRepository } from "@mikro-orm/mongodb";
import { ObjectId } from "mongodb";

type SoftDeletableEntity = {
  _id: ObjectId;
  id: string;
  deleted: boolean;
};

@Injectable()
export class EntityUtilsService {
  constructor(private readonly em: EntityManager) {}

  toObjectIds(ids: string[], label: string) {
    if (ids.some((id) => !ObjectId.isValid(id))) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }
    return ids.map((id) => new ObjectId(id));
  }

  async getActive<T extends { _id: ObjectId; deleted: boolean }>(
    repo: EntityRepository<T>,
    id: string,
    label: string,
  ) {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException(`ID ${label} không hợp lệ`);
    }

    const item = await repo.findOne({ _id: new ObjectId(id) } as never);
    if (!item || item.deleted) {
      throw new NotFoundException(`Không tìm thấy ${label}`);
    }
    return item;
  }

  async softDelete<T extends SoftDeletableEntity>(
    repo: EntityRepository<T>,
    ids: string[],
  ) {
    const objectIds = this.toObjectIds(ids, "ID cần xóa");
    const items = await repo.find({
      _id: { $in: objectIds },
      deleted: false,
    } as never);

    items.forEach((item) => {
      item.deleted = true;
    });
    await this.em.flush();

    return {
      deletedIds: items.map((item) => item.id),
      deleted: true,
    };
  }
}
