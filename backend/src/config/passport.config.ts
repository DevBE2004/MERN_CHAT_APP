import passport from 'passport'
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt'
import { findByIdUserService } from '../services/user.service'
import { UnauthorizedException } from '../utils/app-error'
import { Env } from './env.config'

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([
        req => {
          const token = req.cookies.accessToken
          console.log(token)
          if (!token) throw new UnauthorizedException('Unauthorized access')
          return token
        },
      ]),
      secretOrKey: Env.JWT_SECRET,
      audience: ['user'],
      algorithms: ['HS256'],
    },
    async ({ userId }, done) => {
      try {
        const user = userId && (await findByIdUserService(userId))
        return done(null, user || false)
      } catch (error) {
        return done(null, false)
      }
    },
  ),
)

export const passportAuthenticateJwt = passport.authenticate('jwt', {
  session: false,
})
