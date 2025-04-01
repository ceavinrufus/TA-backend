import { type AllConfigType } from '@/config/config.type';
import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function setupSwagger(app: INestApplication, prefix?: string) {
  const configService = app.get(ConfigService<AllConfigType>);
  const appName = configService.getOrThrow('app.name', { infer: true });

  const config = new DocumentBuilder()
    .setTitle(appName)
    .setDescription('A boilerplate project')
    .setVersion('1.0')
    .setContact('Company Name', 'https://example.com', 'contact@company.com')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .addServer(
      configService.getOrThrow('app.url', { infer: true }),
      'Development',
    )
    .addServer('https://example.com', 'Staging')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${prefix}/api-docs`, app, document, {
    customSiteTitle: appName,
  });
}

export default setupSwagger;
