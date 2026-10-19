package com.tara.pom.boards.controller;

import com.tara.pom.auth.entity.Department;
import com.tara.pom.auth.entity.User;
import com.tara.pom.auth.repository.DepartmentRepository;
import com.tara.pom.auth.repository.UserRepository;
import com.tara.pom.boards.BoardAccess;
import com.tara.pom.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 현황판 '인원' 탭 — POM 사용자·부서(ERP 동기화본)로만 보여준다. 휴가·연차는 POM 에서 관리하지 않는다(사용자 결정 2026-10-19).
 * 기본 범위 = 생산본부(1300) 하위 전 부서, 재직(ACTIVE)만.
 */
@Tag(name = "Boards", description = "현황판 데이터")
@RestController
@RequestMapping("/api/boards/people")
@RequiredArgsConstructor
public class BoardPeopleController {

    private static final int COMPANY = 1000;
    private static final int DEFAULT_ROOT = 1300;
    private static final List<String> READERS = List.of("production-ops", "print-part", "equipment-tech", "outsourcing");

    private final BoardAccess access;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;

    public record Person(String employeeNo, String name, Integer deptCd, String deptNm, String jobTitle, String role, String email, String phone) {
    }

    public record DeptCount(Integer deptCd, String deptNm, Integer upDeptCd, int headcount) {
    }

    public record People(Integer rootDeptCd, String rootDeptNm, int total, List<DeptCount> departments, List<Person> people) {
    }

    @Operation(summary = "부서별 인원 (재직)", description = "rootDeptCd 하위 부서 전부. 기본 1300 생산본부.")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<People> people(@RequestParam(required = false) Integer rootDeptCd) {
        access.assertCanViewAny(READERS);
        int root = rootDeptCd != null ? rootDeptCd : DEFAULT_ROOT;
        List<Department> all = departmentRepository.findAllByCompanyCd(COMPANY);
        Map<Integer, Department> byCd = new HashMap<>();
        for (Department d : all) byCd.put(d.getId().getDeptCd(), d);
        Set<Integer> tree = new LinkedHashSet<>();
        Deque<Integer> q = new ArrayDeque<>(List.of(root));
        while (!q.isEmpty()) {
            Integer cd = q.poll();
            if (!tree.add(cd)) continue;
            for (Department d : all) {
                if (cd.equals(d.getUpDeptCd()) && !"N".equalsIgnoreCase(String.valueOf(d.getUseYn()))) q.add(d.getId().getDeptCd());
            }
        }
        List<Person> people = new ArrayList<>();
        Map<Integer, Integer> counts = new HashMap<>();
        for (User u : userRepository.findAllByCompanyCd(COMPANY)) {
            if (u.getDeptCd() == null || !tree.contains(u.getDeptCd())) continue;
            if (u.getStatus() == null || !"ACTIVE".equals(u.getStatus().name())) continue;
            Department d = byCd.get(u.getDeptCd());
            people.add(new Person(u.getEmployeeNo(), u.getName(), u.getDeptCd(), d == null ? "" : d.getDeptNm(),
                    u.getJobTitle(), u.getRole() == null ? "" : u.getRole().name(), u.getEmail(), u.getPhone()));
            counts.merge(u.getDeptCd(), 1, Integer::sum);
        }
        people.sort(Comparator.comparing(Person::deptCd).thenComparing(Person::name));
        List<DeptCount> depts = new ArrayList<>();
        for (Integer cd : tree) {
            Department d = byCd.get(cd);
            if (d == null) continue;
            depts.add(new DeptCount(cd, d.getDeptNm(), d.getUpDeptCd(), counts.getOrDefault(cd, 0)));
        }
        Department rootDept = byCd.get(root);
        return ApiResponse.ok(new People(root, rootDept == null ? "" : rootDept.getDeptNm(), people.size(), depts, people));
    }
}
