// `astronomia` ships no TypeScript types and there's no @types package for
// it — these are minimal ambient declarations covering only what
// ephemeris.ts actually calls, not the whole library surface.
declare module 'astronomia' {
  export namespace planetposition {
    interface EclipticPosition {
      lon: number;
      lat: number;
      range: number;
    }
    class Planet {
      constructor(data: unknown);
      position(jd: number): EclipticPosition;
      position2000(jd: number): EclipticPosition;
    }
  }

  export namespace moonposition {
    function position(jde: number): { lon: number; lat: number; range: number };
  }

  export namespace julian {
    function DateToJD(date: Date): number;
    function CalendarGregorianToJD(year: number, month: number, day: number): number;
    class Calendar {
      constructor(date?: Date);
      fromDate(date: Date): Calendar;
      midnight(): Calendar;
      toJDE(): number;
      toDate(): Date;
    }
  }

  export namespace sunrise {
    class Sunrise {
      /** @param lon - longitude in degrees, measured positively WESTWARD (opposite of this app's convention — negate before passing in). */
      constructor(date: julian.Calendar, lat: number, lon: number);
      rise(): julian.Calendar | undefined;
      set(): julian.Calendar | undefined;
    }
  }

  export namespace base {
    function J2000Century(jde: number): number;
  }

  export namespace sidereal {
    /** Greenwich mean sidereal time, in radians (2π = 24h). */
    function mean(jd: number): number;
  }

  export namespace nutation {
    /** Mean obliquity of the ecliptic, in radians. */
    function meanObliquity(jde: number): number;
  }
}

declare module 'astronomia/data' {
  const data: Record<string, unknown>;
  export default data;
}
