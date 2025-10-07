import { ExceptionFilter as Base, Catch, ArgumentsHost, UnprocessableEntityException, HttpException, NotFoundException } from '@nestjs/common'

@Catch()
export class ExceptionFilter implements Base {
  catch(exception: any, host: ArgumentsHost) {
    let response = host.switchToHttp().getResponse(),
      status = 500,
      context: any = 'error'

    if (exception instanceof NotFoundException) {
      return response.status(404).send()
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      context = exception.message
      return response.status(status).send(context || '好像哪里出错了')
    }

    console.error(exception)
    return response.status(status).send(context)
  }
}
