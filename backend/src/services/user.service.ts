import UserModel from '../models/user.model'

export const findByIdUserService = async (userId: string) => {
  return await UserModel.findById(userId).lean()
}

export const getUsersService = async (userId: string) => {
  const users = await UserModel.find({ _id: { $ne: userId } })
    .select('-passsword')
    .lean()

  return users
}
