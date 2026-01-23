import { createClient } from '@supabase/supabase-js';
import { type DbTrack, dbTrackToTrackEntry } from '~/types';

export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids: number[] }>(event);

  if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Missing or invalid ids array'
    });
  }

  // Limit to 50 tracks per request
  const ids = body.ids.slice(0, 50);

  const config = useRuntimeConfig();
  const supabaseUrl = config.supabaseUrl as string;
  const supabaseKey = config.supabaseKey as string;

  if (!supabaseUrl || !supabaseKey) {
    throw createError({
      statusCode: 500,
      message: 'Database not configured'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .in('soundcloud_id', ids);

  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message
    });
  }

  // Convert to TrackEntry and maintain original order
  const tracksMap = new Map((data || []).map((t: DbTrack) => [t.soundcloud_id, dbTrackToTrackEntry(t)]));
  const orderedTracks = ids
    .map(id => tracksMap.get(id))
    .filter(Boolean);

  return orderedTracks;
});
