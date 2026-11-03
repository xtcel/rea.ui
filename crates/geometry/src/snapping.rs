//! ABI buffers contain f64 values (lengths count values, not bytes).
use std::slice;
#[derive(Clone, Copy, Debug, Default)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}
impl Rect {
    fn edges(self, axis: usize) -> [f64; 3] {
        let (p, n) = if axis == 0 {
            (self.x, self.w)
        } else {
            (self.y, self.h)
        };
        [p, p + n / 2.0, p + n]
    }
    fn span(self, axis: usize) -> (f64, f64) {
        if axis == 0 {
            (self.y, self.y + self.h)
        } else {
            (self.x, self.x + self.w)
        }
    }
}
fn bounds(rects: &[Rect]) -> Option<Rect> {
    let first = *rects.first()?;
    Some(rects.iter().skip(1).fold(first, |a, b| Rect {
        x: a.x.min(b.x),
        y: a.y.min(b.y),
        w: (a.x + a.w).max(b.x + b.w) - a.x.min(b.x),
        h: (a.y + a.h).max(b.y + b.h) - a.y.min(b.y),
    }))
}
pub fn snap_result(moving: &[Rect], others: &[Rect], threshold: f64) -> (Vec<f64>, usize) {
    let mut out = vec![0.0; 10];
    let mut count = 0;
    let Some(b) = bounds(moving) else {
        return (out, count);
    };
    for axis in 0..2 {
        let mut best = threshold;
        let mut found = None;
        for other in others {
            for target in other.edges(axis) {
                for edge in b.edges(axis) {
                    let delta = target - edge;
                    if delta.abs() <= best && (found.is_none() || delta.abs() < best) {
                        best = delta.abs();
                        found = Some((delta, target, *other));
                    }
                }
            }
        }
        if let Some((delta, target, other)) = found {
            out[axis] = delta;
            let (a, z) = b.span(axis);
            let (c, d) = other.span(axis);
            out[2 + count * 4..6 + count * 4].copy_from_slice(&[
                axis as f64,
                target,
                a.min(c),
                z.max(d),
            ]);
            count += 1;
        }
    }
    (out, count)
}
pub fn distribution(moving: &[Rect], others: &[Rect], threshold: f64) -> (Vec<f64>, usize) {
    let mut out = vec![0.0; 18];
    let mut count = 0;
    let Some(b) = bounds(moving) else {
        return (out, count);
    };
    for axis in 0..2 {
        let edges = b.edges(axis);
        let (cross_start, cross_end) = b.span(axis);
        let mut before: Option<(f64, Rect)> = None;
        let mut after: Option<(f64, Rect)> = None;
        for other in others {
            let (a, z) = other.span(axis);
            if z < cross_start || a > cross_end {
                continue;
            }
            let e = other.edges(axis);
            if e[2] <= edges[0] && before.is_none_or(|(edge, _)| e[2] > edge) {
                before = Some((e[2], *other));
            }
            if e[0] >= edges[2] && after.is_none_or(|(edge, _)| e[0] < edge) {
                after = Some((e[0], *other));
            }
        }
        let shift = match (before, after) {
            (Some((a, _)), Some((z, _))) => {
                let d = (a + z - edges[0] - edges[2]) / 2.0;
                if d.abs() <= threshold {
                    d
                } else {
                    0.0
                }
            }
            _ => 0.0,
        };
        out[axis] = shift;
        let cross = (cross_start + cross_end) / 2.0;
        if let Some((a, _)) = before {
            out[2 + count * 4..6 + count * 4].copy_from_slice(&[
                axis as f64,
                a,
                edges[0] + shift,
                cross,
            ]);
            count += 1;
        }
        if let Some((z, _)) = after {
            out[2 + count * 4..6 + count * 4].copy_from_slice(&[
                axis as f64,
                edges[2] + shift,
                z,
                cross,
            ]);
            count += 1;
        }
    }
    (out, count)
}
#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut f64 {
    if len == 0 || len > 4_000_000 {
        return std::ptr::null_mut();
    }
    Box::into_raw(vec![0.0; len].into_boxed_slice()) as *mut f64
}
/// # Safety
/// ptr and len must identify one live buffer returned by alloc; free exactly once.
#[no_mangle]
pub unsafe extern "C" fn dealloc(ptr: *mut f64, len: usize) {
    if !ptr.is_null() && len > 0 {
        drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, len)));
    }
}
unsafe fn rects(ptr: *const f64, n: usize) -> Vec<Rect> {
    if n == 0 {
        return vec![];
    }
    slice::from_raw_parts(ptr, n * 4)
        .chunks_exact(4)
        .map(|c| Rect {
            x: c[0],
            y: c[1],
            w: c[2],
            h: c[3],
        })
        .collect()
}
/// # Safety
/// Input buffers contain n*4 values; output has space for 10 values. Buffers cannot alias.
#[no_mangle]
pub unsafe extern "C" fn snap_rects(
    moving: *const f64,
    n: usize,
    others: *const f64,
    m: usize,
    threshold: f64,
    out: *mut f64,
) -> usize {
    let (values, count) = snap_result(&rects(moving, n), &rects(others, m), threshold.max(0.0));
    slice::from_raw_parts_mut(out, 10).copy_from_slice(&values);
    count
}
/// # Safety
/// Input buffers contain n*4 values; output has space for 18 values. Buffers cannot alias.
#[no_mangle]
pub unsafe extern "C" fn distribute_marks(
    moving: *const f64,
    n: usize,
    others: *const f64,
    m: usize,
    threshold: f64,
    out: *mut f64,
) -> usize {
    let (values, count) = distribution(&rects(moving, n), &rects(others, m), threshold.max(0.0));
    slice::from_raw_parts_mut(out, 18).copy_from_slice(&values);
    count
}
#[cfg(test)]
mod tests {
    use super::*;
    fn r(x: f64, y: f64, w: f64, h: f64) -> Rect {
        Rect { x, y, w, h }
    }
    #[test]
    fn edge_center_and_threshold() {
        let (v, n) = snap_result(
            &[r(96.0, 50.0, 20.0, 20.0)],
            &[r(100.0, 0.0, 100.0, 20.0)],
            4.0,
        );
        assert_eq!(v[0], 4.0);
        assert_eq!(n, 1);
        assert_eq!(
            snap_result(
                &[r(96.0, 50.0, 20.0, 20.0)],
                &[r(100.0, 0.0, 100.0, 20.0)],
                3.99
            )
            .1,
            0
        );
        assert_eq!(
            snap_result(
                &[r(137.0, 50.0, 20.0, 20.0)],
                &[r(100.0, 0.0, 100.0, 20.0)],
                6.0
            )
            .0[0],
            3.0
        );
    }
    #[test]
    fn equal_gaps() {
        let (v, n) = distribution(
            &[r(43.0, 0.0, 20.0, 20.0)],
            &[r(0.0, 0.0, 20.0, 20.0), r(80.0, 0.0, 20.0, 20.0)],
            6.0,
        );
        assert_eq!(v[0], -3.0);
        assert_eq!(n, 2);
        assert_eq!(v[4] - v[3], v[8] - v[7]);
    }
}
