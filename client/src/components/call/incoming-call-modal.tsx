import AvatarWithBadge from '@/components/avatar-with-badge'
import { Phone, PhoneOff } from 'lucide-react'

interface Props {
  callerName?: string
  callerAvatar?: string
  onAccept: () => void
  onReject: () => void
}

const IncomingCallModal = ({ callerName, callerAvatar, onAccept, onReject }: Props) => {
  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4'>
      <div className='bg-white dark:bg-zinc-900 p-5 sm:p-8 rounded-3xl shadow-2xl w-full max-w-[280px] sm:max-w-[320px] text-center border border-white/10'>
        <div className='flex justify-center mb-4 sm:mb-6'>
          <div className='relative ring-4 ring-green-500/20 rounded-full p-1'>
            <AvatarWithBadge size='lg' name={callerName || 'user'} src={callerAvatar} />
          </div>
        </div>

        <h2 className='text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white'>
          {callerName || 'Người lạ'}
        </h2>

        <p className='text-gray-500 dark:text-gray-400 mt-1 mb-6 sm:mb-8 text-sm sm:text-base'>
          Đang gọi video...
        </p>

        <div className='flex justify-center gap-6 sm:gap-10 mt-4 sm:mt-6'>
          <button
            onClick={onReject}
            className='bg-red-500 hover:bg-red-600 transition-all text-white p-3 sm:p-5 rounded-full shadow-lg'
          >
            <PhoneOff size={22} className='sm:w-7 sm:h-7' />
          </button>

          <button
            onClick={onAccept}
            className='bg-green-500 hover:bg-green-600 transition-all text-white p-3 sm:p-5 rounded-full shadow-lg shadow-green-500/30'
          >
            <Phone size={22} className='sm:w-7 sm:h-7' />
          </button>
        </div>
      </div>
    </div>
  )
}

export default IncomingCallModal
