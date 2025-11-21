import { relations } from 'drizzle-orm'

import { user } from './user'
import { token } from './token'
import { favorites } from './favorites'
import { user_video_record } from './user_video_record'
import { library } from './library'
import { video_list } from './video_list'
import { video_season } from './video_season'
import { video_episode } from './video_episode'
import { video_image } from './video_image'
import { video_media } from './video_media'
import { video_subtitle } from './video_subtitle'
import { video_people } from './video_people'
import { video_genre } from './video_genre'

export const LibraryRelations = relations(library, ({ many }) => ({
  video_lists: many(video_list),
}))

export const VideoListRelations = relations(video_list, ({ one, many }) => ({
  library: one(library, {
    fields: [video_list.video_library_id],
    references: [library.id],
  }),
  user_video_records: many(user_video_record),
}))

export const VideoSeasonRelations = relations(video_season, ({ one, many }) => ({
  video_episodes: many(video_episode),
  user_video_records: many(user_video_record),
}))

export const VideoEpisodeRelations = relations(video_episode, ({ one, many }) => ({
  video_season: one(video_season, {
    fields: [video_episode.video_season_id],
    references: [video_season.id],
  }),
  video_medias: many(video_media),
  user_video_records: many(user_video_record),
}))

export const VideoMediaRelations = relations(video_media, ({ one, many }) => ({
  video_episode: one(video_episode, {
    fields: [video_media.video_episode_id],
    references: [video_episode.id],
  }),
  subtitles: many(video_subtitle),
  user_video_records: many(user_video_record),
}))

export const VideoSubtitleRelations = relations(video_subtitle, ({ one }) => ({
  video_media: one(video_media, {
    fields: [video_subtitle.video_media_id],
    references: [video_media.id],
  }),
}))

export const UserVideoRecordRelations = relations(user_video_record, ({ one }) => ({
  video_list: one(video_list, {
    fields: [user_video_record.video_list_id],
    references: [video_list.id],
  }),
  video_season: one(video_season, {
    fields: [user_video_record.video_season_id],
    references: [video_season.id],
  }),
  video_episode: one(video_episode, {
    fields: [user_video_record.video_episode_id],
    references: [video_episode.id],
  }),
  video_media: one(video_media, {
    fields: [user_video_record.video_media_id],
    references: [video_media.id],
  }),
}))

export {
  // prettier-ignore
  user,
  token,
  favorites,
  user_video_record,
  library,
  video_list,
  video_season,
  video_episode,
  video_image,
  video_media,
  video_subtitle,
  video_people,
  video_genre,
}
