import prisma from '../lib/prisma'

const SETTINGS_ID = 'global_settings'

export class AdminService {

  // Usa upsert para nunca retornar null, mesmo que o seed não tenha rodado
  async getSettings() {
    return prisma.systemSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID, isAIActive: true },
    })
  }

  // Liga ou desliga a chave geral da IA no sistema
  async setAIActive(active: boolean) {
    return prisma.systemSettings.upsert({
      where: { id: SETTINGS_ID },
      update: { isAIActive: active },
      create: { id: SETTINGS_ID, isAIActive: active },
    })
  }
}
