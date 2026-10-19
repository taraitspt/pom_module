package com.tara.pom.boards;

import com.tara.pom.common.exception.BusinessException;
import com.tara.pom.common.exception.ErrorCode;
import com.tara.pom.common.menu.MenuCatalog;
import com.tara.pom.common.menu.MenuPermission;
import com.tara.pom.common.menu.MenuPermissionRepository;
import com.tara.pom.common.util.SecurityContextUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 현황판 접근 판정 — 메뉴 권한 {@code /dashboards/{slug}} 하나로 HTML(1차)과 데이터 API(2차) 를 같이 가린다.
 * slug 는 {@link MenuCatalog} 에 등록된 것만 받는다(경로 조작 방지). {@code DashboardController} 와 같은 규칙.
 */
@Component
@RequiredArgsConstructor
public class BoardAccess {

    public static final String KEY_PREFIX = "/dashboards/";

    private final MenuPermissionRepository menuPermissionRepository;

    /** 등록된 현황판이고 현재 역할에 권한이 있어야 통과. 아니면 404/403. */
    public void assertCanView(String slug) {
        String menuKey = KEY_PREFIX + slug;
        boolean known = MenuCatalog.ENTRIES.stream().anyMatch(e -> e.getMenuKey().equals(menuKey));
        if (!known) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "없는 현황판입니다: " + slug);
        }
        if (!canView(slug)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
    }

    /** 현재 역할이 그 현황판 메뉴를 볼 수 있는가. */
    public boolean canView(String slug) {
        String role = SecurityContextUtil.getCurrentRole();
        return role != null && menuPermissionRepository
                .findById(new MenuPermission.Id(KEY_PREFIX + slug, role))
                .map(p -> Boolean.TRUE.equals(p.getCanView()))
                .orElse(false);
    }

    /** 여러 현황판 중 하나라도 볼 수 있어야 통과 — 공유 데이터(정비 이슈 등)용. */
    public void assertCanViewAny(List<String> slugs) {
        if (slugs.stream().noneMatch(this::canView)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
    }
}
