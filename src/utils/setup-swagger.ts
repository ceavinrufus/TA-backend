import { type AllConfigType } from '@/config/config.type';
import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function setupSwagger(app: INestApplication) {
  const configService = app.get(ConfigService<AllConfigType>);
  const appName = configService.getOrThrow('app.name', { infer: true });

  const config = new DocumentBuilder()
    .setTitle(appName)
    .setDescription('API documentation')
    .setVersion('1.0')
    .setContact(
      'Ceavin Rufus',
      'https://ceavinrufus.me',
      'ceavin.dev@gmail.com',
    )
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .addServer(
      configService.getOrThrow('app.url', { infer: true }),
      'Development',
    )
    .addServer('https://ta-backend-kckp.onrender.com', 'Production')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`api-docs`, app, document, {
    customSiteTitle: appName,
  });
}

export default setupSwagger;
