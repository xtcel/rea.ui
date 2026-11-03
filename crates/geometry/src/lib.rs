//! Stateless geometry. TSX remains the document; this crate stores no scene graph.
mod snapping;

#[no_mangle]
pub extern "C" fn geometry_version() -> u32 {
    1
}

#[no_mangle]
pub extern "C" fn snap_coordinate(value: f64, grid: f64) -> f64 {
    if !value.is_finite() {
        return 0.0;
    }
    if !grid.is_finite() || grid <= 0.0 {
        return value;
    }
    (value / grid).round() * grid
}

#[no_mangle]
pub extern "C" fn rect_component(index: u32, ax: f64, ay: f64, bx: f64, by: f64) -> f64 {
    [ax.min(bx), ay.min(by), (bx - ax).abs(), (by - ay).abs()]
        .get(index as usize)
        .copied()
        .unwrap_or(0.0)
}

/// Edge bitmask: left=1, top=2, right=4, bottom=8. Opposite edges stay fixed.
#[no_mangle]
pub extern "C" fn resize_component(
    index: u32,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    dx: f64,
    dy: f64,
    edges: u32,
) -> f64 {
    let (mut left, mut top, mut right, mut bottom) = (x, y, x + width, y + height);
    if edges & 1 != 0 {
        left = (left + dx).min(right - 4.0);
    }
    if edges & 2 != 0 {
        top = (top + dy).min(bottom - 4.0);
    }
    if edges & 4 != 0 {
        right = (right + dx).max(left + 4.0);
    }
    if edges & 8 != 0 {
        bottom = (bottom + dy).max(top + 4.0);
    }
    [left, top, right - left, bottom - top]
        .get(index as usize)
        .copied()
        .unwrap_or(0.0)
}

#[no_mangle]
pub extern "C" fn ellipse_hit(px: f64, py: f64, x: f64, y: f64, w: f64, h: f64) -> u32 {
    if w <= 0.0 || h <= 0.0 {
        return 0;
    }
    let nx = (px - x - w / 2.0) / (w / 2.0);
    let ny = (py - y - h / 2.0) / (h / 2.0);
    u32::from(nx * nx + ny * ny <= 1.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn reverse_draw_preserves_origin() {
        assert_eq!(rect_component(0, 200.0, 100.0, 40.0, 20.0), 40.0);
        assert_eq!(rect_component(2, 200.0, 100.0, 40.0, 20.0), 160.0);
    }
    #[test]
    fn resize_does_not_cross_opposite_edge() {
        assert_eq!(
            resize_component(0, 10.0, 20.0, 100.0, 80.0, 300.0, 0.0, 1),
            106.0
        );
        assert_eq!(
            resize_component(2, 10.0, 20.0, 100.0, 80.0, 300.0, 0.0, 1),
            4.0
        );
    }
    #[test]
    fn snaps_and_rejects_nonfinite_values() {
        assert_eq!(snap_coordinate(13.0, 8.0), 16.0);
        assert_eq!(snap_coordinate(f64::NAN, 1.0), 0.0);
    }
    #[test]
    fn ellipse_corner_does_not_hit() {
        assert_eq!(ellipse_hit(0.0, 0.0, 0.0, 0.0, 100.0, 100.0), 0);
        assert_eq!(ellipse_hit(50.0, 50.0, 0.0, 0.0, 100.0, 100.0), 1);
    }
}
