<?php

declare(strict_types=1);

namespace App\Services\Storage;

use Aws\S3\S3Client;

final class S3ExportService
{
    public function createPresignedDownloadUrl(string $filePath, int $expirationMinutes = 15): string
    {
        $config = config('filesystems.disks.s3');
        $clientConfig = [
            'version'     => 'latest',
            'region'      => $config['region'],
            'credentials' => [
                'key'    => $config['key'],
                'secret' => $config['secret'],
            ],
        ];
        if (! empty($config['endpoint'])) {
            $clientConfig['endpoint'] = $config['endpoint'];
            $clientConfig['use_path_style_endpoint'] = $config['use_path_style_endpoint'] ?? false;
        }
        $client = new S3Client($clientConfig);

        $cmd = $client->getCommand('GetObject', [
            'Bucket' => $config['bucket'],
            'Key'    => $filePath,
        ]);

        return (string) $client->createPresignedRequest($cmd, "+{$expirationMinutes} minutes")->getUri();
    }
}
