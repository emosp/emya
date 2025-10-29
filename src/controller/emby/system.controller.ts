import { Controller, Res, Get, Post, Delete, Put } from '@nestjs/common'

import { EmbyService } from '@/controller/emby/emby.service'
import { IgnoreAuth } from '@/controller/emby/auth.decorator'

@Controller(['/emby/system'])
export class SystemController {
  constructor(private EmbyService: EmbyService) {}

  @Get('Info')
  async Info() {
    return {
      SystemUpdateLevel: 'Beta',
      OperatingSystemDisplayName: 'Unix',
      HasPendingRestart: false,
      IsShuttingDown: false,
      HasImageEnhancers: false,
      OperatingSystem: 'Linux',
      SupportsLibraryMonitor: true,
      SupportsLocalPortConfiguration: true,
      SupportsWakeServer: false,
      WebSocketPortNumber: 8096,
      CompletedInstallations: [],
      CanSelfRestart: true,
      CanSelfUpdate: false,
      CanLaunchWebBrowser: false,
      ProgramDataPath: '/emya',
      ItemsByNamePath: '/emya/metadata',
      CachePath: '/emya/cache',
      LogPath: '/emya/logs',
      InternalMetadataPath: '/emya/metadata',
      TranscodingTempPath: '/emya/transcoding-temp',
      HttpServerPortNumber: 8096,
      SupportsHttps: false,
      HttpsPortNumber: 8920,
      HasUpdateAvailable: false,
      SupportsAutoRunAtStartup: false,
      HardwareAccelerationRequiresPremiere: true,
      WakeOnLanInfo: {
        MacAddress: 'FFFFFFFFFFFF',
        BroadcastAddress: '255.255.255.255',
        Port: 9,
      },
      IsInMaintenanceMode: false,
      LocalAddress: 'http://emya:8096',
      LocalAddresses: ['http://emya:8096'],
      WanAddress: 'http://emya:8096',
      RemoteAddresses: ['http://emya:8096'],
      ServerName: this.EmbyService.ServerName(),
      Version: this.EmbyService.Version(),
      Id: this.EmbyService.Id(),
    }
  }

  @Get('Info/Public')
  @IgnoreAuth()
  async InfoPublic() {
    return {
      LocalAddresses: [],
      RemoteAddresses: [],
      ServerName: this.EmbyService.ServerName(),
      Version: this.EmbyService.Version(),
      Id: this.EmbyService.Id(),
    }
  }

  // https://github.com/uhdnow/emby_ext_domains
  @Get('Ext/ServerDomains')
  async ExtServerDomains(@Res() res: any) {
    try {
      let data = JSON.parse(process.env?.EMBY_EXT_SERVER_DOMAINS)
      return res.send({
        data,
        ok: true,
      })
    } catch (e) {
      console.error(`ext_server_domains error: ${e}`)
      return res.status(404).send()
    }
  }

  @Get('Ping')
  @IgnoreAuth()
  async Ping() {
    return 'Emya Server'
  }
}
