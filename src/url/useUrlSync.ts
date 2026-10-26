import { useEffect } from 'react';
import { pruneIncomplete } from '../filter/evaluate';
import { serializeView, type ViewState } from './urlState';

const WRITE_DELAY_MS = 150;

// Mirrors the view into the address bar. replaceState (not pushState) so every
// keystroke or click doesn't add a Back-button entry; debounced because browsers
// throttle very frequent URL updates.
export function useUrlSync({ filter, sort, pinned, selected, detailsId }: ViewState) {
  useEffect(() => {
    const timer = setTimeout(() => {
      // Unfinished conditions aren't saved: a link only holds filters that apply.
      const search = serializeView({ filter: pruneIncomplete(filter), sort, pinned, selected, detailsId });
      if (search !== window.location.search) {
        window.history.replaceState(null, '', `${window.location.pathname}${search}`);
      }
    }, WRITE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [filter, sort, pinned, selected, detailsId]);
}
