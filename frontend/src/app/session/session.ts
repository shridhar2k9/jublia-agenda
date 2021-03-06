export class Session {
  id: number;
  name: string;
  description: string;
  tracks: number[];
  track: number; // TODO: Remove this when multi-track session is ready
  speakers: number[];
  start_at: number;  //number of minutes since start of the event
  duration: number;  //number of minutes
  url: string;
  venue: number;
  popularity: number;
  categories: any;
  is_dirty: boolean; // Has event been updated after the event is published?
  //not from api
  tags: number[];
  placeholder: boolean;
  order: number;
  toggle: boolean = true;
}